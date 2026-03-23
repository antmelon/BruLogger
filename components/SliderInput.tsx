import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

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
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#8B5A2B' }}
        />
      ) : (
        // On mobile we'll render pip buttons as a simple fallback
        <View style={styles.pips}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((v) => (
            <View
              key={v}
              style={[styles.pip, v <= value ? styles.pipFilled : styles.pipEmpty]}
              onTouchEnd={() => onChange(v)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: '#4A3728', fontWeight: '500' },
  value: { fontSize: 14, color: '#8B5A2B', fontWeight: '700' },
  pips: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8 },
  pip: { width: 32, height: 32, borderRadius: 16 },
  pipFilled: { backgroundColor: '#8B5A2B' },
  pipEmpty: { backgroundColor: '#D4C5A9' },
});
