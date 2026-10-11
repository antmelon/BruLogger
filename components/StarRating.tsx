import React, { useId } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, AccessibilityActionEvent } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { colors } from '../lib/theme';
import { ratingLabel, stepRating } from '../lib/a11y';

// 5-pointed star centered at (12,12), outer r=10, inner r=4
const STAR_PATH = 'M12,2 L14.35,8.76 L21.51,8.91 L15.80,13.24 L17.88,20.09 L12,16 L6.12,20.09 L8.20,13.24 L2.49,8.91 L9.65,8.76 Z';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  size?: number;
  readonly?: boolean;
  /** What screen readers call the editable stars */
  label?: string;
}

function StarIcon({ fill, size, clipId }: { fill: 'full' | 'half' | 'empty'; size: number; clipId: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="0" y="0" width="12" height="24" />
        </ClipPath>
      </Defs>
      <Path d={STAR_PATH} fill={colors.borderLight} />
      {fill !== 'empty' && (
        <Path
          d={STAR_PATH}
          fill={colors.primary}
          clipPath={fill === 'half' ? `url(#${clipId})` : undefined}
        />
      )}
    </Svg>
  );
}

/**
 * Screen readers get the stars as one element. Read-only, it's a picture labelled with the rating.
 * Editable, it's a slider: swipe up/down (VoiceOver, TalkBack) or arrow keys (web) move it half a
 * star, which tapping a star's left or right half does for everyone else.
 */
function starsAccessibility(value: number, label: string, onChange?: (val: number) => void) {
  if (!onChange) return { role: 'img' as const, 'aria-label': ratingLabel(value) };
  const step = (direction: 'increment' | 'decrement') => onChange(stepRating(value, direction));
  return {
    role: 'slider' as const,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': 5,
    'aria-valuenow': value,
    'aria-valuetext': ratingLabel(value),
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    onAccessibilityAction: (e: AccessibilityActionEvent) =>
      step(e.nativeEvent.actionName === 'increment' ? 'increment' : 'decrement'),
    focusable: true,
    // react-native-web passes keyboard events through to the element; the native types lack them
    ...(Platform.OS === 'web' && {
      onKeyDown: (e: { key: string; preventDefault(): void }) => {
        const direction = { ArrowRight: 'increment', ArrowUp: 'increment', ArrowLeft: 'decrement', ArrowDown: 'decrement' }[e.key];
        if (!direction) return;
        e.preventDefault();
        step(direction as 'increment' | 'decrement');
      },
    }),
  };
}

export default function StarRating({ value, onChange, size = 24, readonly = false, label = 'Rating' }: StarRatingProps) {
  // Unique per instance, for the half-star clip path; only characters safe inside url(#...)
  const uid = `sr${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const editable = !readonly && onChange ? onChange : undefined;
  const a11y = starsAccessibility(value, label, editable);

  return (
    <View style={styles.row} accessible {...a11y}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = value >= star ? 'full' : value >= star - 0.5 ? 'half' : 'empty';
        return (
          <View key={star} style={{ width: size, height: size }}>
            <StarIcon fill={fill} size={size} clipId={`${uid}-${star}`} />
            {editable && (
              // For pointers only; the row above is what screen readers and the keyboard use
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={(e) => {
                  const isHalf = e.nativeEvent.locationX < size / 2;
                  editable(isHalf ? Math.max(1, star - 0.5) : star);
                }}
                activeOpacity={0.7}
                accessible={false}
                focusable={false}
                aria-hidden
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
