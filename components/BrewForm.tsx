import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image, ActionSheetIOS, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BrewInsert, BrewMethod, FlavorProfile, RoastLevel, BREW_METHODS, ROAST_LEVELS } from '../types';
import { uploadBrewPhoto } from '../lib/brews';
import { prepareForUpload } from '../lib/photos';
import { toBrewInsert } from '../lib/form';
import { colors, shadows } from '../lib/theme';
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

function SelectPills<T extends string>({
  options, value, onChange, label,
}: { options: T[]; value: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pills}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, value === opt && styles.pillActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function BrewForm({ initial = {}, onSubmit, submitLabel = 'Save Brew' }: BrewFormProps) {
  const [coffeeName, setCoffeeName] = useState(initial.coffee_name ?? '');
  const [roaster, setRoaster] = useState(initial.roaster ?? '');
  const [origin, setOrigin] = useState(initial.origin ?? '');
  const [roastLevel, setRoastLevel] = useState<RoastLevel | null>(initial.roast_level ?? null);
  const [varietal, setVarietal] = useState(initial.varietal ?? '');
  const [processingMethod, setProcessingMethod] = useState(initial.processing_method ?? '');
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setPhotoUrl(null);
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
    const result = toBrewInsert({
      coffeeName, roaster, origin, roastLevel, varietal, processingMethod, brewMethod, grindSize,
      waterTemp, dose, yieldG, brewTime, flavorNotes, generalNotes, rating, profile, photoUrl,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      let photo_url = result.value.photo_url ?? null; // kept, removed (null) or never set
      if (photoUri) {
        photo_url = await uploadBrewPhoto(photoUri);
        // Keep the uploaded URL so a retry after a failed save doesn't upload again
        setPhotoUri(null);
        setPhotoUrl(photo_url);
      }
      await onSubmit({ ...result.value, photo_url });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Coffee basics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>The Coffee</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Coffee Name *</Text>
          <TextInput
            style={styles.input}
            value={coffeeName}
            onChangeText={setCoffeeName}
            placeholder="e.g. Ethiopia Yirgacheffe"
            placeholderTextColor={colors.textLight}
          />
        </View>

        <View style={styles.row2}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Roaster</Text>
            <TextInput style={styles.input} value={roaster} onChangeText={setRoaster} placeholder="Roaster name" placeholderTextColor={colors.textLight} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Origin</Text>
            <TextInput style={styles.input} value={origin} onChangeText={setOrigin} placeholder="Country/Region" placeholderTextColor={colors.textLight} />
          </View>
        </View>

        <SelectPills options={ROAST_LEVELS} value={roastLevel} onChange={setRoastLevel} label="Roast Level" />

        <View style={styles.row2}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Varietal</Text>
            <TextInput style={styles.input} value={varietal} onChangeText={setVarietal} placeholder="e.g. Gesha, Bourbon" placeholderTextColor={colors.textLight} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Processing Method</Text>
            <TextInput style={styles.input} value={processingMethod} onChangeText={setProcessingMethod} placeholder="e.g. Washed, Natural" placeholderTextColor={colors.textLight} />
          </View>
        </View>
      </View>

      {/* Brew details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brew Details</Text>
        <SelectPills options={BREW_METHODS} value={brewMethod} onChange={setBrewMethod} label="Brew Method *" />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Grind Size</Text>
          <TextInput style={styles.input} value={grindSize} onChangeText={setGrindSize} placeholder="e.g. Medium-Fine" placeholderTextColor={colors.textLight} />
        </View>

        <View style={styles.row3}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Water (°C)</Text>
            <TextInput style={styles.input} value={waterTemp} onChangeText={setWaterTemp} keyboardType="numeric" placeholder="93" placeholderTextColor={colors.textLight} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Dose (g)</Text>
            <TextInput style={styles.input} value={dose} onChangeText={setDose} keyboardType="numeric" placeholder="18" placeholderTextColor={colors.textLight} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Yield (g)</Text>
            <TextInput style={styles.input} value={yieldG} onChangeText={setYieldG} keyboardType="numeric" placeholder="36" placeholderTextColor={colors.textLight} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Brew Time (seconds)</Text>
          <TextInput style={styles.input} value={brewTime} onChangeText={setBrewTime} keyboardType="numeric" placeholder="240" placeholderTextColor={colors.textLight} />
        </View>
      </View>

      {/* Flavor profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Flavor Profile</Text>
        {profile ? (
          <>
            <SliderInput label="Aromatics" value={profile.aromatics} onChange={(v) => setProfileField('aromatics', v)} />
            <SliderInput label="Acidity" value={profile.acidity} onChange={(v) => setProfileField('acidity', v)} />
            <SliderInput label="Sweetness" value={profile.sweetness} onChange={(v) => setProfileField('sweetness', v)} />
            <SliderInput label="Aftertaste" value={profile.aftertaste} onChange={(v) => setProfileField('aftertaste', v)} />
            <SliderInput label="Body" value={profile.body} onChange={(v) => setProfileField('body', v)} />
            <TouchableOpacity onPress={() => setProfile(null)} style={styles.profileRemove} activeOpacity={0.7}>
              <Text style={styles.profileRemoveText}>Remove flavor profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => setProfile(DEFAULT_PROFILE)} style={styles.photoPlaceholder} activeOpacity={0.7}>
            <Text style={styles.photoPlaceholderText}>Score the flavor profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tasting Notes</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Flavor Notes</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={flavorNotes}
            onChangeText={setFlavorNotes}
            placeholder="e.g. Blueberry, jasmine, dark chocolate..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>General Notes</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={generalNotes}
            onChangeText={setGeneralNotes}
            placeholder="Anything else worth noting..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Overall Rating</Text>
          <StarRating value={rating} onChange={setRating} size={32} />
        </View>
      </View>

      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo</Text>
        {(photoUri || photoUrl) ? (
          <View>
            <Image
              source={{ uri: (photoUri ?? photoUrl) as string }}
              style={styles.photoPreview}
              resizeMode="contain"
            />
            <View style={styles.photoActions}>
              <TouchableOpacity onPress={pickImage} style={styles.photoActionBtn} activeOpacity={0.7}>
                <Text style={styles.photoActionText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setPhotoUri(null); setPhotoUrl(null); }}
                style={[styles.photoActionBtn, styles.photoActionRemove]}
                activeOpacity={0.7}
              >
                <Text style={[styles.photoActionText, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={pickImage} style={styles.photoPlaceholder} activeOpacity={0.7}>
            <ImageIcon size={28} color={colors.textLight} />
            <Text style={styles.photoPlaceholderText}>Add a photo of your brew</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={saving || preparingPhoto} activeOpacity={0.85}>
        {saving || preparingPhoto
          ? <ActivityIndicator color={colors.surface} />
          : <Text style={styles.submitText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.surfaceWarm,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  row3: { flexDirection: 'row', gap: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceWarm,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, color: colors.textMedium, fontWeight: '500' },
  pillTextActive: { color: colors.surface, fontWeight: '700' },
  errorText: { color: colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.button,
  },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
