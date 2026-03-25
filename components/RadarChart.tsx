import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { FlavorProfile } from '../types';

interface RadarChartProps {
  profile: FlavorProfile;
  size?: number;
}

const LABELS: (keyof FlavorProfile)[] = [
  'aromatics',
  'acidity',
  'sweetness',
  'aftertaste',
  'body',
];

const LABEL_DISPLAY: Record<keyof FlavorProfile, string> = {
  aromatics: 'Aromatics',
  acidity: 'Acidity',
  sweetness: 'Sweetness',
  aftertaste: 'Aftertaste',
  body: 'Body',
};

const MAX_VALUE = 5;
const NUM_RINGS = 5;

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleIndex: number,
  total: number
): { x: number; y: number } {
  // Start from top (-90 deg), go clockwise
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

export default function RadarChart({ profile, size = 260 }: RadarChartProps) {
  const padding = 52; // room for labels on left/right edges
  const svgWidth = size + padding * 2;
  const svgHeight = size + padding;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;
  const maxRadius = size * 0.36;
  const labelOffset = size * 0.1;
  const n = LABELS.length;

  // Build ring polygons (background grid)
  const rings = Array.from({ length: NUM_RINGS }, (_, ring) => {
    const r = (maxRadius * (ring + 1)) / NUM_RINGS;
    const points = LABELS.map((_, i) => {
      const pt = polarToCartesian(cx, cy, r, i, n);
      return `${pt.x},${pt.y}`;
    }).join(' ');
    return points;
  });

  // Build data polygon
  const dataPoints = LABELS.map((key, i) => {
    const value = profile[key] ?? 0;
    const r = (maxRadius * value) / MAX_VALUE;
    const pt = polarToCartesian(cx, cy, r, i, n);
    return `${pt.x},${pt.y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={svgWidth} height={svgHeight}>
        {/* Grid rings */}
        {rings.map((points, i) => (
          <Polygon
            key={i}
            points={points}
            fill="none"
            stroke="#D4C5A9"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {LABELS.map((_, i) => {
          const outer = polarToCartesian(cx, cy, maxRadius, i, n);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="#D4C5A9"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPoints}
          fill="rgba(139, 90, 43, 0.25)"
          stroke="#8B5A2B"
          strokeWidth={2}
        />

        {/* Data points */}
        {LABELS.map((key, i) => {
          const value = profile[key] ?? 0;
          const r = (maxRadius * value) / MAX_VALUE;
          const pt = polarToCartesian(cx, cy, r, i, n);
          return (
            <Circle key={i} cx={pt.x} cy={pt.y} r={4} fill="#8B5A2B" />
          );
        })}

        {/* Labels */}
        {LABELS.map((key, i) => {
          const pt = polarToCartesian(cx, cy, maxRadius + labelOffset, i, n);
          const isLeft = pt.x < cx - 5;
          const isRight = pt.x > cx + 5;
          const textAnchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
          return (
            <SvgText
              key={i}
              x={pt.x}
              y={pt.y + 4}
              textAnchor={textAnchor}
              fontSize={11}
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="#4A3728"
            >
              {LABEL_DISPLAY[key]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
