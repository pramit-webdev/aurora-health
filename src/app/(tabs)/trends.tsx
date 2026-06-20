import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, subDays } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useAurora, selectStreaks } from '@/lib/store';
import { dateKey, daysAgoKey, formatDuration, formatMl } from '@/lib/dates';
import { palette, spacing } from '@/constants/theme';
import { AText, Card, ProgressRing, Screen } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';

type Range = 7 | 30;

interface Achievement {
  emoji: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

export default function Trends() {
  const [range, setRange] = useState<Range>(7);
  const waterHistory = useAurora((s) => s.waterHistory);
  const sleepLogs = useAurora((s) => s.sleepLogs);
  const habits = useAurora((s) => s.habits);
  const habitLogs = useAurora((s) => s.habitLogs);
  const mealHistory = useAurora((s) => s.mealHistory);
  const profile = useAurora((s) => s.profile);
  const streaks = useAurora(useShallow(selectStreaks));

  const since = daysAgoKey(range - 1);

  const waterByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of waterHistory) {
      const k = dateKey(new Date(w.logged_at));
      if (k >= since) m.set(k, (m.get(k) ?? 0) + w.amount_ml);
    }
    return m;
  }, [waterHistory, since]);

  const goalMl = profile?.water_goal_ml ?? 2500;
  const waterGoalDays = [...waterByDay.values()].filter((v) => v >= goalMl).length;
  const waterAvg = waterByDay.size
    ? Math.round([...waterByDay.values()].reduce((a, b) => a + b, 0) / waterByDay.size)
    : 0;

  const rangeSleep = sleepLogs.filter((l) => l.date >= since);
  const sleepAvg = rangeSleep.length
    ? Math.round(rangeSleep.reduce((a, l) => a + l.duration_min, 0) / rangeSleep.length)
    : null;

  const rangeHabitLogs = habitLogs.filter((l) => l.date >= since);
  const habitCompleted = rangeHabitLogs.filter((l) => l.status === 'completed').length;

  const rangeMeals = mealHistory.filter((m) => dateKey(new Date(m.logged_at)) >= since);
  const mealDays = new Set(rangeMeals.map((m) => dateKey(new Date(m.logged_at)))).size;
  const calAvg = mealDays ? Math.round(rangeMeals.reduce((a, m) => a + m.calories, 0) / mealDays) : 0;

  // Consistency score: blend of how many range-days each pillar was acted on
  const consistencyScore = useMemo(() => {
    const daysTracked = (keys: Set<string>) => keys.size / range;
    const waterDays = new Set([...waterByDay.keys()]);
    const sleepDays = new Set(rangeSleep.map((l) => l.date));
    const habitDays = new Set(rangeHabitLogs.map((l) => l.date));
    const mealDaysSet = new Set(rangeMeals.map((m) => dateKey(new Date(m.logged_at))));
    const parts = [waterDays, sleepDays, habitDays, mealDaysSet].map(daysTracked);
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  }, [waterByDay, rangeSleep, rangeHabitLogs, rangeMeals, range]);

  // Week view: 7 daily bars. Month view: 4 weekly-average bars.
  const weeklyBuckets = useMemo(
    () =>
      Array.from({ length: 4 }, (_, w) => ({
        label: `W${w + 1}`,
        days: Array.from({ length: 7 }, (_, i) => dateKey(subDays(new Date(), 27 - w * 7 - i))),
      })),
    [],
  );

  const sleepChart = useMemo(() => {
    const byDate = new Map(sleepLogs.map((l) => [l.date, l.duration_min]));
    if (range === 7) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { label: format(d, 'EEEEE'), value: byDate.get(dateKey(d)) ?? 0 };
      });
    }
    return weeklyBuckets.map((b) => {
      const vals = b.days.map((k) => byDate.get(k)).filter((v): v is number => v != null);
      return { label: b.label, value: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0 };
    });
  }, [sleepLogs, range, weeklyBuckets]);

  const waterChart = useMemo(() => {
    if (range === 7) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return { label: format(d, 'EEEEE'), value: waterByDay.get(dateKey(d)) ?? 0 };
      });
    }
    return weeklyBuckets.map((b) => {
      const vals = b.days.map((k) => waterByDay.get(k)).filter((v): v is number => v != null);
      return { label: b.label, value: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0 };
    });
  }, [waterByDay, range, weeklyBuckets]);

  const achievements: Achievement[] = useMemo(() => {
    const totalWaterLogs = waterHistory.length;
    const bestStreak = Math.max(streaks.hydration, streaks.sleep, streaks.habits);
    return [
      { emoji: '💧', title: 'First sip', desc: 'Log water for the first time', unlocked: totalWaterLogs > 0 },
      { emoji: '🌊', title: 'Hydro hero', desc: 'Hit your water goal', unlocked: waterGoalDays > 0 },
      { emoji: '🌙', title: 'Night owl no more', desc: 'Log 3 nights of sleep', unlocked: sleepLogs.length >= 3 },
      { emoji: '🌱', title: 'Habit builder', desc: 'Create your first habit', unlocked: habits.length > 0 },
      { emoji: '✅', title: 'Day one done', desc: 'Complete a habit', unlocked: habitLogs.some((l) => l.status === 'completed') },
      { emoji: '🔥', title: 'On a roll', desc: 'Reach a 3-day streak', unlocked: bestStreak >= 3 },
      { emoji: '🏆', title: 'Week of wins', desc: 'Reach a 7-day streak', unlocked: bestStreak >= 7 },
      { emoji: '🥗', title: 'Mindful eater', desc: 'Log 5 meals', unlocked: mealHistory.length >= 5 },
    ];
  }, [waterHistory, waterGoalDays, sleepLogs, habits, habitLogs, streaks, mealHistory]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Screen>
      <View style={styles.titleRow}>
        <AText variant="title">Trends</AText>
        <View style={styles.toggle}>
          {([7, 30] as Range[]).map((r) => (
            <AText
              key={r}
              onPress={() => setRange(r)}
              variant="caption"
              style={[styles.toggleItem, range === r && styles.toggleActive]}>
              {r === 7 ? 'Week' : 'Month'}
            </AText>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: spacing.xl }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
            <ProgressRing
              size={96}
              strokeWidth={10}
              progress={consistencyScore / 100}
              color={palette.auroraTeal}
              colorEnd={palette.auroraViolet}>
              <AText variant="bodyBold" style={{ fontSize: 18 }}>
                {consistencyScore}
              </AText>
            </ProgressRing>
            <View style={{ flex: 1, gap: 4 }}>
              <AText variant="heading">Consistency score</AText>
              <AText variant="body" style={{ fontSize: 13, lineHeight: 19 }}>
                {consistencyScore >= 70
                  ? 'Outstanding — showing up is the whole game, and you are.'
                  : consistencyScore >= 35
                    ? 'Good momentum. A little more tracking sharpens your insights.'
                    : 'Every log teaches Aurora more about you. Start small today.'}
              </AText>
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={[styles.statsGrid, { marginTop: spacing.md }]}>
        {(
          [
            ['💧', 'Avg water', waterAvg ? formatMl(waterAvg) : '—', `goal hit ${waterGoalDays}×`],
            ['🌙', 'Avg sleep', formatDuration(sleepAvg), `${rangeSleep.length} nights logged`],
            ['✅', 'Habits done', `${habitCompleted}`, `last ${range} days`],
            ['🍽️', 'Avg intake', calAvg ? `${calAvg} kcal` : '—', `${rangeMeals.length} meals logged`],
          ] as const
        ).map(([emoji, label, value, sub]) => (
          <Card key={label} style={styles.statCard}>
            <AText style={{ fontSize: 18 }}>{emoji}</AText>
            <AText variant="display" style={{ fontSize: 20, marginTop: 4 }}>
              {value}
            </AText>
            <AText variant="caption" style={{ fontSize: 11 }}>
              {label} · {sub}
            </AText>
          </Card>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(500)} style={{ marginTop: spacing.md, gap: spacing.md }}>
        <Card>
          <AText variant="label" style={{ marginBottom: spacing.lg }}>
            💧 Hydration — {range === 7 ? 'last 7 days' : 'weekly averages (30 days)'}
          </AText>
          <BarChart data={waterChart} color={palette.hydration} colorEnd={palette.hydrationDeep} goal={goalMl} formatValue={formatMl} height={110} />
        </Card>
        <Card>
          <AText variant="label" style={{ marginBottom: spacing.lg }}>
            🌙 Sleep — {range === 7 ? 'last 7 nights' : 'weekly averages (30 days)'}
          </AText>
          <BarChart
            data={sleepChart}
            color={palette.sleep}
            colorEnd={palette.sleepDeep}
            goal={profile?.sleep_goal_min ?? 480}
            formatValue={(v) => formatDuration(v)}
            height={110}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(500)} style={{ marginTop: spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AText variant="heading">Achievements</AText>
          <AText variant="caption">
            {unlockedCount}/{achievements.length} unlocked
          </AText>
        </View>
        <View style={[styles.statsGrid, { marginTop: spacing.md }]}>
          {achievements.map((a) => (
            <Card key={a.title} style={[styles.badge, !a.unlocked && { opacity: 0.38 }]}>
              <AText style={{ fontSize: 26 }}>{a.emoji}</AText>
              <AText variant="bodyBold" style={{ fontSize: 13, textAlign: 'center' }}>
                {a.title}
              </AText>
              <AText variant="caption" style={{ fontSize: 10, textAlign: 'center' }}>
                {a.desc}
              </AText>
            </Card>
          ))}
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 3,
  },
  toggleItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  toggleActive: { backgroundColor: palette.surfaceRaised, color: palette.auroraTeal },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { width: '47.5%', padding: spacing.lg, flexGrow: 1 },
  badge: { width: '47.5%', padding: spacing.lg, alignItems: 'center', gap: 4, flexGrow: 1 },
});
