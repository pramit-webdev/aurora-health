import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AText, Card, ProgressBar, ProgressRing } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';
import { formatDuration, formatMl } from '@/lib/dates';
import type { TodayStats } from '@/lib/types';

function CardHeader({ icon, title, accent }: { icon: keyof typeof Ionicons.glyphMap; title: string; accent: string }) {
  return (
    <View style={styles.header}>
      <View style={[styles.iconBubble, { backgroundColor: `${accent}1F` }]}>
        <Ionicons name={icon} size={15} color={accent} />
      </View>
      <AText variant="label" style={{ color: palette.textSecondary }}>
        {title}
      </AText>
      <Ionicons name="chevron-forward" size={15} color={palette.textTertiary} style={{ marginLeft: 'auto' }} />
    </View>
  );
}

// ---------- Daily Insight ----------
export function InsightCard({ content, loading }: { content: string | null; loading?: boolean }) {
  return (
    <Card style={{ padding: 0 }}>
      <LinearGradient
        colors={['rgba(79,209,197,0.16)', 'rgba(129,140,248,0.12)', 'rgba(167,139,250,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing.xl, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="sparkles" size={14} color={palette.auroraTeal} />
          <AText variant="label" style={{ color: palette.auroraTeal }}>
            Today’s insight
          </AText>
        </View>
        <AText variant="heading" style={{ lineHeight: 24, fontSize: 16 }}>
          {loading ? 'Aurora is looking at your day…' : content ?? 'Log your first day and Aurora will start finding patterns made just for you.'}
        </AText>
      </LinearGradient>
    </Card>
  );
}

// ---------- Hydration ----------
export function HydrationCard({ stats }: { stats: TodayStats }) {
  const progress = stats.waterGoalMl > 0 ? stats.waterMl / stats.waterGoalMl : 0;
  const remaining = Math.max(stats.waterGoalMl - stats.waterMl, 0);
  return (
    <Card accent={palette.hydration} onPress={() => router.push('/hydration')} style={{ flex: 1, minWidth: 0 }}>
      <CardHeader icon="water" title="Hydration" accent={palette.hydration} />
      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        <ProgressRing size={108} strokeWidth={11} progress={progress} color={palette.hydration} colorEnd={palette.auroraTeal}>
          <AText variant="bodyBold" style={{ fontSize: 17 }}>
            {Math.round(progress * 100)}%
          </AText>
        </ProgressRing>
      </View>
      <AText variant="bodyBold" style={{ fontSize: 15 }}>
        {formatMl(stats.waterMl)} <AText variant="caption">of {formatMl(stats.waterGoalMl)}</AText>
      </AText>
      <AText variant="caption" style={{ marginTop: 2 }}>
        {remaining > 0 ? `${formatMl(remaining)} to go` : 'Goal reached 🎉'}
      </AText>
    </Card>
  );
}

// ---------- Sleep ----------
export function SleepCard({ stats }: { stats: TodayStats }) {
  const last = stats.sleepLastNightMin;
  const avg = stats.sleepWeekAvgMin;
  const delta = last != null && avg != null ? last - avg : null;
  return (
    <Card accent={palette.sleep} onPress={() => router.push('/sleep')} style={{ flex: 1, minWidth: 0 }}>
      <CardHeader icon="moon" title="Sleep" accent={palette.sleep} />
      <View style={{ marginVertical: spacing.md, gap: 2 }}>
        <AText variant="display" style={{ fontSize: 30 }}>
          {last != null ? formatDuration(last) : '—'}
        </AText>
        <AText variant="caption">last night</AText>
      </View>
      <AText variant="caption">
        Weekly avg <AText variant="bodyBold" style={{ fontSize: 13 }}>{formatDuration(avg)}</AText>
      </AText>
      {delta == null ? (
        <AText variant="caption" style={{ marginTop: 2 }}>
          Log sleep to see trends
        </AText>
      ) : Math.abs(delta) < 10 ? (
        <AText variant="caption" style={{ color: palette.success, marginTop: 2 }}>
          Right on your average ✨
        </AText>
      ) : (
        <AText variant="caption" style={{ color: delta >= 0 ? palette.success : palette.warning, marginTop: 2 }}>
          {delta >= 0 ? '▲' : '▼'} {formatDuration(Math.abs(delta))} vs your average
        </AText>
      )}
    </Card>
  );
}

// ---------- Habits ----------
export function HabitsCard({ stats }: { stats: TodayStats }) {
  const pct = stats.habitsDue > 0 ? stats.habitsCompleted / stats.habitsDue : 0;
  return (
    <Card accent={palette.habit} onPress={() => router.push('/(tabs)/habits')} style={{ flex: 1, minWidth: 0 }}>
      <CardHeader icon="checkmark-done" title="Habits" accent={palette.habit} />
      <View style={{ marginVertical: spacing.md, gap: 2 }}>
        <AText variant="display" style={{ fontSize: 30 }}>
          {stats.habitsCompleted}
          <AText variant="title" color={palette.textTertiary}>
            /{stats.habitsDue}
          </AText>
        </AText>
        <AText variant="caption">done today</AText>
      </View>
      <ProgressBar progress={pct} color={palette.habit} colorEnd={palette.auroraTeal} height={7} />
      <AText variant="caption" style={{ marginTop: spacing.sm }}>
        {stats.habitsDue === 0
          ? 'No habits yet — create one'
          : pct >= 1
            ? 'All done — beautiful 🌿'
            : `${Math.round(pct * 100)}% of today`}
      </AText>
    </Card>
  );
}

// ---------- Nutrition ----------
export function NutritionCard({ stats }: { stats: TodayStats }) {
  return (
    <Card accent={palette.nutrition} onPress={() => router.push('/nutrition')} style={{ flex: 1, minWidth: 0 }}>
      <CardHeader icon="restaurant" title="Nutrition" accent={palette.nutrition} />
      <View style={{ marginVertical: spacing.md, gap: 2 }}>
        <AText variant="display" style={{ fontSize: 30 }}>
          {stats.calories}
          <AText variant="title" color={palette.textTertiary}>
            {' '}
            kcal
          </AText>
        </AText>
        <AText variant="caption">
          {stats.mealsLogged} {stats.mealsLogged === 1 ? 'meal' : 'meals'} logged
        </AText>
      </View>
      <View style={styles.macroRow}>
        {(
          [
            ['P', stats.protein_g, palette.habit],
            ['C', stats.carbs_g, palette.hydration],
            ['F', stats.fat_g, palette.nutrition],
          ] as const
        ).map(([label, value, color]) => (
          <View key={label} style={styles.macro}>
            <AText variant="caption" style={{ color, fontSize: 11 }}>
              {label}
            </AText>
            <AText variant="bodyBold" style={{ fontSize: 13 }}>
              {value}g
            </AText>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------- Streaks ----------
export function StreakCard({ streaks }: { streaks: { hydration: number; sleep: number; habits: number } }) {
  const best = Math.max(streaks.hydration, streaks.sleep, streaks.habits);
  return (
    <Card accent={palette.streak} onPress={() => router.push('/(tabs)/trends')}>
      <CardHeader icon="flame" title="Streaks" accent={palette.streak} />
      <View style={styles.streakRow}>
        {(
          [
            ['💧', 'Hydration', streaks.hydration],
            ['🌙', 'Sleep', streaks.sleep],
            ['✅', 'Habits', streaks.habits],
          ] as const
        ).map(([emoji, label, days]) => (
          <View key={label} style={styles.streakItem}>
            <AText style={{ fontSize: 22, lineHeight: 30 }}>{emoji}</AText>
            <AText variant="display" style={{ fontSize: 24 }}>
              {days}
            </AText>
            <AText variant="caption" style={{ fontSize: 11 }}>
              {label}
            </AText>
          </View>
        ))}
      </View>
      <AText variant="caption" style={{ textAlign: 'center', marginTop: spacing.md }}>
        {best === 0 ? 'Start a streak today — every day counts.' : `🔥 ${best} day${best === 1 ? '' : 's'} strong. Keep it alive!`}
      </AText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBubble: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  macroRow: { flexDirection: 'row', gap: spacing.md },
  macro: { flex: 1, alignItems: 'center', gap: 1, backgroundColor: 'rgba(148,163,184,0.08)', borderRadius: 10, paddingVertical: 6 },
  streakRow: { flexDirection: 'row', marginTop: spacing.lg },
  streakItem: { flex: 1, alignItems: 'center', gap: 2 },
});
