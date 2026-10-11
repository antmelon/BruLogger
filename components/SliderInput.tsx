import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NativeSlider from '@react-native-community/slider';
import { colors } from '../lib/theme';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

export default function SliderInput({ label, value, onChange, min = 1, max = 5 }: SliderInputProps) {
  const valueText = `${value} out of ${max}`;
  return (
    <View style={styles.container}>
      {/* The slider itself carries the label and value for screen readers */}
      <View style={styles.row} aria-hidden>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {Platform.OS === 'web' ? (
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          aria-valuetext={valueText}
          style={{ width: '100%', accentColor: colors.primary }}
        />
      ) : (
        <NativeSlider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={0.5}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.borderLight}
          thumbTintColor={colors.primary}
          accessibilityLabel={label}
          accessibilityValue={{ text: valueText }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: colors.textDark, fontWeight: '500' },
  value: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  slider: { width: '100%', height: 40 },
});
