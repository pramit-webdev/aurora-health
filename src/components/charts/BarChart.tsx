import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing } from '@/constants/theme';
import { AText } from '@/components/ui';

export interface BarDatum {
  label: string;
  value: number;
  /** optional override, e.g. highlight today */
  highlight?: boolean;
}

interface Props {
  data: BarDatum[];
  color: string;
  colorEnd?: string;
  height?: number;
  /** value that counts as "goal" — renders a dashed line */
  goal?: number;
  formatValue?: (v: number) => string;
}

function Bar({ value, max, color, colorEnd, height, index, highlight }: {
  value: number;
  max: number;
  color: string;
  colorEnd?: string;
  height: number;
  index: number;
  highlight?: boolean;
}) {
  const h = useSharedValue(0);
  const target = max > 0 ? Math.max((value / max) * height, value > 0 ? 6 : 0) : 0;
  useEffect(() => {
    h.value = withDelay(index * 50, withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [target, index, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View style={[styles.bar, { opacity: highlight === false ? 0.45 : 1 }, style]}>
      <LinearGradient
        colors={[colorEnd ?? color, color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function BarChart({ data, color, colorEnd, height = 140, goal, formatValue }: Props) {
  const max = Math.max(...data.map((d) => d.value), goal ?? 0, 1);
  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {goal != null && goal > 0 ? (
          <View style={[styles.goalLine, { bottom: (goal / max) * height }]}>
            <View style={styles.goalDash} />
            {formatValue ? (
              <AText variant="caption" style={styles.goalLabel}>
                {formatValue(goal)}
              </AText>
            ) : null}
          </View>
        ) : null}
        <View style={styles.bars}>
          {data.map((d, i) => (
            <View key={`${d.label}-${i}`} style={styles.barSlot}>
              <Bar
                value={d.value}
                max={max}
                color={color}
                colorEnd={colorEnd}
                height={height}
                index={i}
                highlight={d.highlight}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <AText key={`${d.label}-${i}`} variant="caption" style={styles.label}>
            {d.label}
          </AText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: '100%' },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '64%', borderRadius: 6, overflow: 'hidden' },
  labels: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  label: { flex: 1, textAlign: 'center', fontSize: 11 },
  goalLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  goalDash: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderStyle: 'dashed',
  },
  goalLabel: { position: 'absolute', right: 0, top: -16, fontSize: 10, color: palette.textTertiary },
});
