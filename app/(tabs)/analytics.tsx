import { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions, Platform,
} from 'react-native';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { useBrews } from '../../lib/brewQueries';
import { colors, shadows } from '../../lib/theme';
import { avgFlavorProfile, brewStats, countBy } from '../../lib/analytics';
import { Brew, FlavorProfile } from '../../types';
import RadarChart from '../../components/RadarChart';

// ─── Bar chart (horizontal) ──────────────────────────────────────────────────

function HorizBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 10 }}>
      {data.map((d) => (
        <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={barStyles.label} numberOfLines={1}>{d.label}</Text>
          <View style={barStyles.track}>
            <View style={[barStyles.fill, { flex: d.value / max }]} />
            <View style={{ flex: 1 - d.value / max }} />
          </View>
          <Text style={barStyles.count}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

const barStyles = StyleSheet.create({
  label: { width: 96, fontSize: 13, color: colors.textMuted },
  track: { flex: 1, height: 18, flexDirection: 'row', backgroundColor: colors.background, borderRadius: 6, overflow: 'hidden' },
  fill: { backgroundColor: colors.primary, borderRadius: 6 },
  count: { width: 22, fontSize: 13, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
});

// ─── Rating trend chart (SVG line chart) ────────────────────────────────────

function RatingTrendChart({ brews, width }: { brews: Brew[]; width: number }) {
  const rated = useMemo(() =>
    [...brews]
      .filter((b): b is Brew & { rating: number } => !!b.rating)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-30),
    [brews],
  );

  if (rated.length < 2) {
    return (
      <View style={trendStyles.empty}>
        <Text style={trendStyles.emptyText}>Log at least 2 rated brews to see your trend.</Text>
      </View>
    );
  }

  const H = 120;
  const PAD = { top: 12, bottom: 24, left: 20, right: 12 };
  const chartW = width - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const points = rated.map((b, i) => ({
    x: PAD.left + (i / (rated.length - 1)) * chartW,
    y: PAD.top + (1 - (b.rating - 1) / 4) * chartH,
    rating: b.rating,
    date: new Date(b.created_at),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const yLabels = [1, 3, 5];

  return (
    <Svg width={width} height={H}>
      {/* Grid lines */}
      {yLabels.map((r) => {
        const y = PAD.top + (1 - (r - 1) / 4) * chartH;
        return (
          <SvgLine key={r} x1={PAD.left} y1={y} x2={width - PAD.right} y2={y}
            stroke={colors.border} strokeWidth={1} />
        );
      })}
      {/* Y labels */}
      {yLabels.map((r) => {
        const y = PAD.top + (1 - (r - 1) / 4) * chartH;
        return (
          <SvgText key={r} x={PAD.left - 4} y={y + 4} fontSize={10}
            fontFamily={Platform.select({ web: 'system-ui, -apple-system, sans-serif', default: undefined })}
            fill={colors.textLight} textAnchor="end">{r}</SvgText>
        );
      })}
      {/* Trend line */}
      <Path d={linePath} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.primary} />
      ))}
      {/* First and last date labels */}
      {[points[0], points[points.length - 1]].map((p, i) => (
        <SvgText
          key={i}
          x={i === 0 ? PAD.left : width - PAD.right}
          y={H - 2}
          fontSize={10}
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.textLight}
          textAnchor={i === 0 ? 'start' : 'end'}
        >
          {p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </SvgText>
      ))}
    </Svg>
  );
}

const trendStyles = StyleSheet.create({
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textLight, textAlign: 'center' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

const NO_BREWS: Brew[] = [];

export default function AnalyticsScreen() {
  const { data: brews = NO_BREWS, isPending, isError } = useBrews();
  const { width } = useWindowDimensions();
  const chartWidth = width - 32 - 40; // screen - horizontal padding - section padding

  const methodCounts = useMemo(() => countBy(brews.map((b) => b.brew_method)), [brews]);
  const roastCounts = useMemo(() => countBy(brews.filter((b) => b.roast_level).map((b) => b.roast_level!)), [brews]);
  const avgProfile = useMemo(() => avgFlavorProfile(brews), [brews]);
  const scoredCount = useMemo(() => brews.filter((b) => b.flavor_profile).length, [brews]);
  const { avgRating, topMethod } = useMemo(() => brewStats(brews), [brews]);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError && brews === NO_BREWS) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptyText}>Failed to load analytics.</Text>
      </View>
    );
  }

  if (brews.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No brews yet</Text>
        <Text style={styles.emptyText}>Start logging brews to see your analytics.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary tiles */}
      <View style={styles.tilesRow}>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{brews.length}</Text>
          <Text style={styles.tileLabel}>Total Brews</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{avgRating ? avgRating.toFixed(1) : '—'}</Text>
          <Text style={styles.tileLabel}>Avg Rating</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValueSmall} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{topMethod ?? '—'}</Text>
          <Text style={styles.tileLabel}>Fav Method</Text>
        </View>
      </View>

      {/* Rating trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating Over Time</Text>
        <RatingTrendChart brews={brews} width={chartWidth} />
      </View>

      {/* Method distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brews by Method</Text>
        <HorizBarChart data={methodCounts} />
      </View>

      {/* Roast level distribution */}
      {roastCounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brews by Roast Level</Text>
          <HorizBarChart data={roastCounts} />
        </View>
      )}

      {/* Average flavor profile */}
      {avgProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average Flavor Profile</Text>
          <Text style={styles.sectionSubtitle}>
            Averaged across {scoredCount} scored {scoredCount === 1 ? 'brew' : 'brews'}
          </Text>
          <View style={styles.radarWrapper}>
            <RadarChart profile={avgProfile} size={Math.min(chartWidth, 280)} />
          </View>
          <View style={styles.profileBreakdown}>
            {(Object.entries(avgProfile) as [keyof FlavorProfile, number][]).map(([key, val]) => (
              <View key={key} style={styles.profileRow}>
                <Text style={styles.profileLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <View style={styles.profileTrack}>
                  <View style={[styles.profileFill, { flex: val / 5 }]} />
                  <View style={{ flex: 1 - val / 5 }} />
                </View>
                <Text style={styles.profileVal}>{val.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textMedium, textAlign: 'center' },

  tilesRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    ...shadows.card,
  },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  tileValueSmall: { fontSize: 16, fontWeight: '800', color: colors.textDark, marginBottom: 4, textAlign: 'center' },
  tileLabel: { fontSize: 11, color: colors.textMedium, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 12, color: colors.textLight, marginBottom: 14 },

  radarWrapper: { alignItems: 'center', paddingVertical: 8 },

  profileBreakdown: { gap: 8, marginTop: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileLabel: { width: 88, fontSize: 13, color: colors.textMuted },
  profileTrack: { flex: 1, height: 8, flexDirection: 'row', backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  profileFill: { backgroundColor: colors.accent, borderRadius: 4 },
  profileVal: { width: 28, fontSize: 13, fontWeight: '700', color: colors.textDark, textAlign: 'right' },
});
