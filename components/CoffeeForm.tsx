import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Platform, AccessibilityInfo,
} from 'react-native';
import { Coffee, CoffeeInsert } from '../types';
import { coffeeFormValues, CoffeeFormValues, toCoffeeInsert } from '../lib/form';
import { colors } from '../lib/theme';
import CoffeeFields from './CoffeeFields';
import { formStyles } from './FormFields';

interface CoffeeFormProps {
  initial?: Coffee | null;
  onSubmit: (coffee: CoffeeInsert) => Promise<void>;
  submitLabel: string;
}

/** Adding or editing a coffee on its own (in a brew, "New coffee" uses CoffeeFields directly). */
export default function CoffeeForm({ initial, onSubmit, submitLabel }: CoffeeFormProps) {
  const [values, setValues] = useState<CoffeeFormValues>(() => coffeeFormValues(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  async function handleSubmit() {
    const result = toCoffeeInsert(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(result.value);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={formStyles.container} contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled">
      <View style={formStyles.section}>
        <Text style={formStyles.sectionTitle} role="heading">The Coffee</Text>
        <CoffeeFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
      </View>

      {error ? <Text style={formStyles.errorText} role="alert">{error}</Text> : null}

      <TouchableOpacity
        style={formStyles.submitButton}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.85}
        role="button"
        aria-label={submitLabel}
        aria-busy={saving}
        aria-disabled={saving}
      >
        {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={formStyles.submitText}>{submitLabel}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
