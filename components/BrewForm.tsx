import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, ActionSheetIOS, Alert, Platform, AccessibilityInfo,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BrewInsert, BrewMethod, Coffee, FlavorProfile, BREW_METHODS } from '../types';
import { uploadBrewPhoto } from '../lib/brews';
import { useBrews, useCoffees, useCreateCoffee, usePhotoUrl } from '../lib/brewQueries';
import { prepareForUpload } from '../lib/photos';
import { coffeeFormValues, CoffeeFormValues, toBrewFields, toCoffeeInsert } from '../lib/form';
import { daysAgo, daysSinceRoast, pickerCoffees } from '../lib/coffeeStats';
import { colors } from '../lib/theme';
import CoffeeFields from './CoffeeFields';
import { Field, SelectPills, formStyles } from './FormFields';
import SliderInput from './SliderInput';
import StarRating from './StarRating';
import { ImageIcon } from './icons';

// Starting point when the user chooses to score a brew
const DEFAULT_PROFILE: FlavorProfile = { aromatics: 3, acidity: 3, sweetness: 3, aftertaste: 3, body: 3 };

interface BrewFormProps {
  initial?: Partial<BrewInsert>;
  onSubmit: (brew: BrewInsert) => Promise<void>;
  submitLabel?: string;
}

const NO_COFFEES: Coffee[] = [];

/** What the picker shows under a coffee's name. */
function coffeeMeta(coffee: Coffee): string {
  const days = daysSinceRoast(coffee.roast_date);
  return [
    coffee.roaster,
    days !== null && `Roasted ${daysAgo(days)}`,
    coffee.finished_at && 'Finished',
  ].filter(Boolean).join(' · ');
}

/** The coffees in use as a list to choose from, plus "New coffee". `value` null means new. */
function CoffeePicker({
  coffees, value, onChange,
}: { coffees: Coffee[]; value: string | null; onChange: (id: string | null) => void }) {
  const options: { id: string | null; name: string; meta: string }[] = [
    ...coffees.map((c) => ({ id: c.id, name: c.name, meta: coffeeMeta(c) })),
    { id: null, name: '+ New coffee', meta: '' },
  ];
  return (
    <View style={styles.coffeeList} role="radiogroup" aria-label="Coffee, required">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <TouchableOpacity
            key={o.id ?? 'new'}
            style={[styles.coffeeOption, selected && styles.coffeeOptionActive]}
            onPress={() => onChange(o.id)}
            activeOpacity={0.7}
            role="radio"
            aria-checked={selected}
            aria-label={o.id ? [o.name, o.meta].filter(Boolean).join(', ') : 'New coffee'}
          >
            <View style={[styles.radio, selected && styles.radioActive]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={formStyles.flex1}>
              <Text style={[styles.coffeeName, !o.id && styles.coffeeNew]}>{o.name}</Text>
              {o.meta ? <Text style={styles.coffeeMeta}>{o.meta}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function BrewForm({ initial = {}, onSubmit, submitLabel = 'Save Brew' }: BrewFormProps) {
  const { data: coffees = NO_COFFEES, isPending: coffeesPending, isError: coffeesFailed } = useCoffees();
  const { data: brews } = useBrews();
  const createCoffee = useCreateCoffee();
  const coffeeOptions = useMemo(
    () => pickerCoffees(coffees, brews ?? [], initial.coffee_id),
    [coffees, brews, initial.coffee_id],
  );
  // Until the user picks, a brew keeps its coffee and a new brew takes the most recently used one
  // (null: a new coffee, typed in below). Coffees load after the form appears, hence derived.
  const [pickedCoffee, setPickedCoffee] = useState<string | null | undefined>(initial.coffee_id);
  const coffeeId = pickedCoffee !== undefined ? pickedCoffee : coffeeOptions[0]?.id ?? null;
  const [newCoffee, setNewCoffee] = useState<CoffeeFormValues>(() => coffeeFormValues(null));
  const [brewMethod, setBrewMethod] = useState<BrewMethod | null>(initial.brew_method ?? null);
  const [grindSize, setGrindSize] = useState(initial.grind_size ?? '');
  const [waterTemp, setWaterTemp] = useState(initial.water_temp_c?.toString() ?? '');
  const [dose, setDose] = useState(initial.dose_g?.toString() ?? '');
  const [yieldG, setYieldG] = useState(initial.yield_g?.toString() ?? '');
  const [brewTime, setBrewTime] = useState(initial.brew_time_s?.toString() ?? '');
  const [flavorNotes, setFlavorNotes] = useState(initial.flavor_notes ?? '');
  const [generalNotes, setGeneralNotes] = useState(initial.general_notes ?? '');
  const [rating, setRating] = useState(initial.rating ?? 0);
  const [profile, setProfile] = useState<FlavorProfile | null>(initial.flavor_profile ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // photoUri: a newly picked photo, not yet uploaded. photoPath: the saved photo being kept.
  const [photoPath, setPhotoPath] = useState<string | null>(initial.photo_path ?? null);
  const { data: savedPhotoUrl } = usePhotoUrl(photoUri ? null : photoPath);
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Screen readers announce a save error as soon as it appears (web does it through role="alert")
  useEffect(() => {
    if (error && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  function setProfileField(field: keyof FlavorProfile, val: number) {
    setProfile((p) => ({ ...(p ?? DEFAULT_PROFILE), [field]: val }));
  }

  async function launchCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // prepareForUpload does the compression
    });
    if (!result.canceled && result.assets[0]) await setPickedPhoto(result.assets[0]);
  }

  async function launchLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // prepareForUpload does the compression
    });
    if (!result.canceled && result.assets[0]) await setPickedPhoto(result.assets[0]);
  }

  async function setPickedPhoto(asset: ImagePicker.ImagePickerAsset) {
    setPreparingPhoto(true);
    setPhotoUri(await prepareForUpload(asset));
    setPhotoPath(null);
    setPreparingPhoto(false);
  }

  function pickImage() {
    // Web: Alert.alert is a no-op in react-native-web, and the browser's file picker already offers
    // the camera on phones, so open it directly.
    if (Platform.OS === 'web') {
      launchLibrary();
    } else if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) launchCamera();
          else if (buttonIndex === 2) launchLibrary();
        },
      );
    } else {
      Alert.alert('Add Photo', 'Choose source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: launchCamera },
        { text: 'Photo Library', onPress: launchLibrary },
      ]);
    }
  }

  async function handleSubmit() {
    const coffee = coffeeId ? null : toCoffeeInsert(newCoffee);
    if (coffee && !coffee.ok) {
      setError(coffee.error);
      return;
    }
    const result = toBrewFields({
      brewMethod, grindSize, waterTemp, dose, yieldG, brewTime, flavorNotes, generalNotes, rating,
      profile, photoPath,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      let coffee_id = coffeeId;
      if (!coffee_id && coffee?.ok) {
        coffee_id = (await createCoffee.mutateAsync(coffee.value)).id;
        // Pick the saved coffee so a retry after a failed save doesn't create it again
        setPickedCoffee(coffee_id);
      }
      let photo_path = result.value.photo_path ?? null; // kept, removed (null) or never set
      if (photoUri) {
        photo_path = await uploadBrewPhoto(photoUri);
        // Keep the uploaded path so a retry after a failed save doesn't upload again
        setPhotoUri(null);
        setPhotoPath(photo_path);
      }
      await onSubmit({ ...result.value, coffee_id: coffee_id!, photo_path });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={formStyles.container} contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">

      {/* Which coffee: one in use, or a new one */}
      <View style={formStyles.section}>
        <Text style={formStyles.sectionTitle} role="heading">The Coffee</Text>
        {coffeesPending ? (
          <ActivityIndicator color={colors.primary} style={styles.coffeeLoading} aria-label="Loading your coffees" />
        ) : (
          <>
            {coffeesFailed ? (
              <Text style={styles.coffeeError} role="alert">Couldn&apos;t load your coffees. You can still add a new one.</Text>
            ) : null}
            {coffeeOptions.length > 0 ? (
              <CoffeePicker coffees={coffeeOptions} value={coffeeId} onChange={setPickedCoffee} />
            ) : null}
            {coffeeId === null ? (
              <View style={coffeeOptions.length > 0 ? styles.newCoffee : undefined}>
                <CoffeeFields values={newCoffee} onChange={(patch) => setNewCoffee((v) => ({ ...v, ...patch }))} />
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* Brew details */}
      <View style={formStyles.section}>
        <Text style={formStyles.sectionTitle} role="heading">Brew Details</Text>
        <SelectPills options={BREW_METHODS} value={brewMethod} onChange={setBrewMethod} label="Brew Method" required />

        <Field label="Grind Size" value={grindSize} onChangeText={setGrindSize} placeholder="e.g. Medium-Fine" />

        <View style={formStyles.row3}>
          <Field label="Water (°C)" containerStyle={formStyles.flex1} value={waterTemp} onChangeText={setWaterTemp} keyboardType="numeric" placeholder="93" />
          <Field label="Dose (g)" containerStyle={formStyles.flex1} value={dose} onChangeText={setDose} keyboardType="numeric" placeholder="18" />
          <Field label="Yield (g)" containerStyle={formStyles.flex1} value={yieldG} onChangeText={setYieldG} keyboardType="numeric" placeholder="36" />
        </View>

        <Field label="Brew Time (seconds)" value={brewTime} onChangeText={setBrewTime} keyboardType="numeric" placeholder="240" />
      </View>

      {/* Flavor profile */}
      <View style={formStyles.section}>
        <Text style={formStyles.sectionTitle} role="heading">Flavor Profile</Text>
        {profile ? (
          <>
            <SliderInput label="Aromatics" value={profile.aromatics} onChange={(v) => setProfileField('aromatics', v)} />
            <SliderInput label="Acidity" value={profile.acidity} onChange={(v) => setProfileField('acidity', v)} />
            <SliderInput label="Sweetness" value={profile.sweetness} onChange={(v) => setProfileField('sweetness', v)} />
            <SliderInput label="Aftertaste" value={profile.aftertaste} onChange={(v) => setProfileField('aftertaste', v)} />
            <SliderInput label="Body" value={profile.body} onChange={(v) => setProfileField('body', v)} />
            <TouchableOpacity onPress={() => setProfile(null)} style={styles.profileRemove} activeOpacity={0.7} role="button">
              <Text style={styles.profileRemoveText}>Remove flavor profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => setProfile(DEFAULT_PROFILE)} style={styles.photoPlaceholder} activeOpacity={0.7} role="button">
            <Text style={styles.photoPlaceholderText}>Score the flavor profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notes */}
      <View style={formStyles.section}>
        <Text style={formStyles.sectionTitle} role="heading">Tasting Notes</Text>

        <Field
          label="Flavor Notes"
          value={flavorNotes}
          onChangeText={setFlavorNotes}
          placeholder="e.g. Blueberry, jasmine, dark chocolate..."
          multiline
        />

        <Field
          label="General Notes"
          value={generalNotes}
          onChangeText={setGeneralNotes}
          placeholder="Anything else worth noting..."
          multiline
        />

        <View style={formStyles.fieldGroup}>
          <Text style={formStyles.label} aria-hidden>Overall Rating</Text>
          <StarRating value={rating} onChange={setRating} size={32} label="Overall rating" />
        </View>
      </View>

      {/* Photo */}
      <View style={formStyles.section}>
        <Text style={formStyles.sectionTitle} role="heading">Photo</Text>
        {(photoUri || photoPath) ? (
          <View>
            <Image
              source={{ uri: (photoUri ?? savedPhotoUrl ?? '') }}
              style={styles.photoPreview}
              resizeMode="contain"
              alt="Photo of this brew"
            />
            <View style={styles.photoActions}>
              <TouchableOpacity onPress={pickImage} style={styles.photoActionBtn} activeOpacity={0.7} role="button" aria-label="Change photo">
                <Text style={styles.photoActionText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setPhotoUri(null); setPhotoPath(null); }}
                style={[styles.photoActionBtn, styles.photoActionRemove]}
                activeOpacity={0.7}
                role="button"
                aria-label="Remove photo"
              >
                <Text style={[styles.photoActionText, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={pickImage} style={styles.photoPlaceholder} activeOpacity={0.7} role="button">
            <ImageIcon size={28} color={colors.textLight} />
            <Text style={styles.photoPlaceholderText}>Add a photo of your brew</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={formStyles.errorText} role="alert">{error}</Text> : null}

      <TouchableOpacity
        style={formStyles.submitButton}
        onPress={handleSubmit}
        disabled={saving || preparingPhoto}
        activeOpacity={0.85}
        role="button"
        aria-label={submitLabel}
        aria-busy={saving || preparingPhoto}
        aria-disabled={saving || preparingPhoto}
      >
        {saving || preparingPhoto
          ? <ActivityIndicator color={colors.surface} />
          : <Text style={formStyles.submitText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  coffeeLoading: { paddingVertical: 12 },
  coffeeError: { color: colors.error, fontSize: 14, marginBottom: 10 },
  coffeeList: { gap: 8 },
  coffeeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceWarm,
  },
  coffeeOptionActive: { borderColor: colors.primary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  coffeeName: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  coffeeNew: { color: colors.primary },
  coffeeMeta: { fontSize: 13, color: colors.textMedium, marginTop: 2 },
  newCoffee: { marginTop: 16 },
  photoPlaceholder: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceWarm,
  },
  photoPlaceholderText: { fontSize: 14, color: colors.textLight },
  profileRemove: { alignSelf: 'flex-end', paddingTop: 4 },
  profileRemoveText: { fontSize: 13, color: colors.error, fontWeight: '600' },
  photoPreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: colors.background },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  photoActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  photoActionRemove: { borderColor: colors.error },
  photoActionText: { fontSize: 14, fontWeight: '600', color: colors.textMedium },
});
