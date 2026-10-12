import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps, StyleProp, ViewStyle,
} from 'react-native';
import { colors, shadows } from '../lib/theme';

// The pieces the brew and coffee forms are built from.

/** A text field with its label drawn above it; screen readers get the label on the field itself. */
export function Field({
  label, required, containerStyle, multiline, ...input
}: TextInputProps & { label: string; required?: boolean; containerStyle?: StyleProp<ViewStyle> }) {
  return (
    <View style={[formStyles.fieldGroup, containerStyle]}>
      <Text style={formStyles.label} aria-hidden>{required ? `${label} *` : label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        placeholderTextColor={colors.textLight}
        multiline={multiline}
        aria-label={required ? `${label}, required` : label}
        {...input}
      />
    </View>
  );
}

export function SelectPills<T extends string>({
  options, value, onChange, label, required,
}: { options: T[]; value: T | null; onChange: (v: T) => void; label: string; required?: boolean }) {
  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.label} aria-hidden>{required ? `${label} *` : label}</Text>
      <View style={styles.pills} role="radiogroup" aria-label={required ? `${label}, required` : label}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, value === opt && styles.pillActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
            role="radio"
            aria-checked={value === opt}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Layout shared by the forms: sections, rows of fields, the error line and the save button. */
export const formStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  flex1: { flex: 1 },
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
  row2: { flexDirection: 'row', gap: 10 },
  row3: { flexDirection: 'row', gap: 8 },
  errorText: { color: colors.error, fontSize: 14, marginBottom: 12, textAlign: 'center' },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.button,
  },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
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
  // Grows with the text. (numberOfLines would cap it on iOS, scrolling long notes inside the box.)
  textarea: { minHeight: 80, textAlignVertical: 'top' },
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
});
