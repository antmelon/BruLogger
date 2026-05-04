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
  return (
    <View style={styles.container}>
      <View style={styles.row}>
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
