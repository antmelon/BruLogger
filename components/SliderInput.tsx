import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NativeSlider from '@react-native-community/slider';

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
          style={{ width: '100%', accentColor: '#8B5A2B' }}
        />
      ) : (
        <NativeSlider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={0.5}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="#8B5A2B"
          maximumTrackTintColor="#D4C5A9"
          thumbTintColor="#8B5A2B"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: '#4A3728', fontWeight: '500' },
  value: { fontSize: 14, color: '#8B5A2B', fontWeight: '700' },
  slider: { width: '100%', height: 40 },
});
