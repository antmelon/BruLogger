import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';

// 5-pointed star centered at (12,12), outer r=10, inner r=4
const STAR_PATH = 'M12,2 L14.35,8.76 L21.51,8.91 L15.80,13.24 L17.88,20.09 L12,16 L6.12,20.09 L8.20,13.24 L2.49,8.91 L9.65,8.76 Z';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  size?: number;
  readonly?: boolean;
}

function StarIcon({ fill, size, clipId }: { fill: 'full' | 'half' | 'empty'; size: number; clipId: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="0" y="0" width="12" height="24" />
        </ClipPath>
      </Defs>
      <Path d={STAR_PATH} fill="#D4C5A9" />
      {fill !== 'empty' && (
        <Path
          d={STAR_PATH}
          fill="#8B5A2B"
          clipPath={fill === 'half' ? `url(#${clipId})` : undefined}
        />
      )}
    </Svg>
  );
}

export default function StarRating({ value, onChange, size = 24, readonly = false }: StarRatingProps) {
  const uid = useRef(`sr-${Math.random().toString(36).slice(2)}`).current;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = value >= star ? 'full' : value >= star - 0.5 ? 'half' : 'empty';
        return (
          <View key={star} style={{ width: size, height: size }}>
            <StarIcon fill={fill} size={size} clipId={`${uid}-${star}`} />
            {!readonly && (
              <View style={[StyleSheet.absoluteFill, styles.touchRow]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => onChange?.(Math.max(1, star - 0.5))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${Math.max(1, star - 0.5)} stars`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                />
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => onChange?.(star)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} stars`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  touchRow: { flexDirection: 'row' },
});
