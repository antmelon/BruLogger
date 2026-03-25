import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BrewInsert, BrewMethod, FlavorProfile, RoastLevel } from '../types';
import { uploadBrewPhoto } from '../lib/brews';
import SliderInput from './SliderInput';
import StarRating from './StarRating';
import { ImageIcon } from './icons';

const BREW_METHODS: BrewMethod[] = [
  'Pour Over', 'French Press', 'Espresso', 'AeroPress', 'Cold Brew', 'Other',
];

const ROAST_LEVELS: RoastLevel[] = ['Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark'];

const DEFAULT_PROFILE: FlavorProfile = { aromatics: 3, acidity: 3, sweetness: 3, aftertaste: 3, body: 3 };

interface BrewFormProps {
  initial?: Partial<BrewInsert>;
  onSubmit: (brew: BrewInsert) => Promise<void>;
  submitLabel?: string;
}

function SelectPills<T extends string>({
  options, value, onChange, label,
}: { options: T[]; value: T | undefined; onChange: (v: T) => void; label: string }) {
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
  const [roastLevel, setRoastLevel] = useState<RoastLevel | undefined>(initial.roast_level);
  const [varietal, setVarietal] = useState(initial.varietal ?? '');
  const [processingMethod, setProcessingMethod] = useState(initial.processing_method ?? '');
  const [brewMethod, setBrewMethod] = useState<BrewMethod | undefined>(initial.brew_method);
  const [grindSize, setGrindSize] = useState(initial.grind_size ?? '');
  const [waterTemp, setWaterTemp] = useState(initial.water_temp_c?.toString() ?? '');
  const [dose, setDose] = useState(initial.dose_g?.toString() ?? '');
  const [yieldG, setYieldG] = useState(initial.yield_g?.toString() ?? '');
  const [brewTime, setBrewTime] = useState(initial.brew_time_s?.toString() ?? '');
  const [flavorNotes, setFlavorNotes] = useState(initial.flavor_notes ?? '');
  const [generalNotes, setGeneralNotes] = useState(initial.general_notes ?? '');
  const [rating, setRating] = useState(initial.rating ?? 0);
  const [profile, setProfile] = useState<FlavorProfile>(initial.flavor_profile ?? DEFAULT_PROFILE);
  const [photoUri, setPhotoUri] = useState<string | null>(null); // newly picked local URI
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photo_url ?? null); // existing remote URL
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setProfileField(field: keyof FlavorProfile, val: number) {
    setProfile((p) => ({ ...p, [field]: val }));
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoUrl(null); // replace any existing remote photo
    }
  }

  async function handleSubmit() {
    if (!coffeeName.trim()) { setError('Coffee name is required.'); return; }
    if (!brewMethod) { setError('Please select a brew method.'); return; }
    setError(null);
    setSaving(true);
    try {
      let resolvedPhotoUrl: string | undefined;
      if (photoUri) {
        resolvedPhotoUrl = await uploadBrewPhoto(photoUri);
      } else if (photoUrl) {
        resolvedPhotoUrl = photoUrl;
      }

      await onSubmit({
        coffee_name: coffeeName.trim(),
        roaster: roaster.trim() || undefined,
        origin: origin.trim() || undefined,
        roast_level: roastLevel,
        varietal: varietal.trim() || undefined,
        processing_method: processingMethod.trim() || undefined,
        brew_method: brewMethod,
        grind_size: grindSize.trim() || undefined,
        water_temp_c: waterTemp ? Number(waterTemp) : undefined,
        dose_g: dose ? Number(dose) : undefined,
        yield_g: yieldG ? Number(yieldG) : undefined,
        brew_time_s: brewTime ? Number(brewTime) : undefined,
        flavor_notes: flavorNotes.trim() || undefined,
        general_notes: generalNotes.trim() || undefined,
        rating: rating || undefined,
        flavor_profile: profile,
        photo_url: resolvedPhotoUrl,
      });
    } catch (e: any) {
      setError(e.message);
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
            placeholderTextColor="#B0A090"
          />
        </View>

        <View style={styles.row2}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Roaster</Text>
            <TextInput style={styles.input} value={roaster} onChangeText={setRoaster} placeholder="Roaster name" placeholderTextColor="#B0A090" />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Origin</Text>
            <TextInput style={styles.input} value={origin} onChangeText={setOrigin} placeholder="Country/Region" placeholderTextColor="#B0A090" />
          </View>
        </View>

        <SelectPills options={ROAST_LEVELS} value={roastLevel} onChange={setRoastLevel} label="Roast Level" />

        <View style={styles.row2}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Varietal</Text>
            <TextInput style={styles.input} value={varietal} onChangeText={setVarietal} placeholder="e.g. Gesha, Bourbon" placeholderTextColor="#B0A090" />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Processing Method</Text>
            <TextInput style={styles.input} value={processingMethod} onChangeText={setProcessingMethod} placeholder="e.g. Washed, Natural" placeholderTextColor="#B0A090" />
          </View>
        </View>
      </View>

      {/* Brew details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brew Details</Text>
        <SelectPills options={BREW_METHODS} value={brewMethod} onChange={setBrewMethod} label="Brew Method *" />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Grind Size</Text>
          <TextInput style={styles.input} value={grindSize} onChangeText={setGrindSize} placeholder="e.g. Medium-Fine" placeholderTextColor="#B0A090" />
        </View>

        <View style={styles.row3}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Water (°C)</Text>
            <TextInput style={styles.input} value={waterTemp} onChangeText={setWaterTemp} keyboardType="numeric" placeholder="93" placeholderTextColor="#B0A090" />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Dose (g)</Text>
            <TextInput style={styles.input} value={dose} onChangeText={setDose} keyboardType="numeric" placeholder="18" placeholderTextColor="#B0A090" />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Yield (g)</Text>
            <TextInput style={styles.input} value={yieldG} onChangeText={setYieldG} keyboardType="numeric" placeholder="36" placeholderTextColor="#B0A090" />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Brew Time (seconds)</Text>
          <TextInput style={styles.input} value={brewTime} onChangeText={setBrewTime} keyboardType="numeric" placeholder="240" placeholderTextColor="#B0A090" />
        </View>
      </View>

      {/* Flavor profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Flavor Profile</Text>
        <SliderInput label="Aromatics" value={profile.aromatics} onChange={(v) => setProfileField('aromatics', v)} />
        <SliderInput label="Acidity" value={profile.acidity} onChange={(v) => setProfileField('acidity', v)} />
        <SliderInput label="Sweetness" value={profile.sweetness} onChange={(v) => setProfileField('sweetness', v)} />
        <SliderInput label="Aftertaste" value={profile.aftertaste} onChange={(v) => setProfileField('aftertaste', v)} />
        <SliderInput label="Body" value={profile.body} onChange={(v) => setProfileField('body', v)} />
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
            placeholderTextColor="#B0A090"
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
            placeholderTextColor="#B0A090"
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
              source={{ uri: photoUri ?? photoUrl! }}
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
                <Text style={[styles.photoActionText, { color: '#CC4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={pickImage} style={styles.photoPlaceholder} activeOpacity={0.7}>
            <ImageIcon size={28} color="#B0A090" />
            <Text style={styles.photoPlaceholderText}>Add a photo of your brew</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
        {saving
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.submitText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE6' },
  content: { padding: 16, paddingBottom: 48 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5A2B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A3728', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E8DFCF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#4A3728',
    backgroundColor: '#FDFAF6',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  row3: { flexDirection: 'row', gap: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderWidth: 1.5,
    borderColor: '#D4C5A9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FDFAF6',
  },
  pillActive: { backgroundColor: '#8B5A2B', borderColor: '#8B5A2B' },
  pillText: { fontSize: 13, color: '#8C7B6E', fontWeight: '500' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  errorText: { color: '#CC4444', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  photoPlaceholder: {
    borderWidth: 1.5,
    borderColor: '#D4C5A9',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDFAF6',
  },
  photoPlaceholderText: { fontSize: 14, color: '#B0A090' },
  photoPreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#F5EFE6' },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  photoActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D4C5A9',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  photoActionRemove: { borderColor: '#CC4444' },
  photoActionText: { fontSize: 14, fontWeight: '600', color: '#8C7B6E' },
  submitButton: {
    backgroundColor: '#8B5A2B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#8B5A2B',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
