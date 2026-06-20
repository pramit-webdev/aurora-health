import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format, subDays } from 'date-fns';
import { useAurora } from '@/lib/store';
import { dateKey, daysAgoKey, formatDuration, todayKey } from '@/lib/dates';
import { palette, spacing } from '@/constants/theme';
import { AText, Button, Card, Screen } from '@/components/ui';
import { BarChart } from '@/components/charts/BarChart';

function TimeStepper({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  accent: string;
}) {
  const bump = (mins: number) => {
    Haptics.selectionAsync();
    onChange(new Date(value.getTime() + mins * 60000));
  };
  return (
    <View style={styles.stepper}>
      <AText variant="label">{label}</AText>
      <View style={styles.stepperRow}>
        <Pressable onPress={() => bump(-15)} style={styles.stepBtn} hitSlop={8}>
          <Ionicons name="remove" size={18} color={palette.textSecondary} />
        </Pressable>
        <AText
          variant="display"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize: 22, color: accent, flex: 1, textAlign: 'center' }}>
          {format(value, 'h:mm a')}
        </AText>
        <Pressable onPress={() => bump(15)} style={styles.stepBtn} hitSlop={8}>
          <Ionicons name="add" size={18} color={palette.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const defaultBedtime = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 0, 0, 0);
  return d;
};
const defaultWake = () => {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return d;
};

export default function Sleep() {
  const sleepLogs = useAurora((s) => s.sleepLogs);
  const profile = useAurora((s) => s.profile);
  const logSleep = useAurora((s) => s.logSleep);

  const [bedtime, setBedtime] = useState(defaultBedtime);
  const [wakeTime, setWakeTime] = useState(defaultWake);
  const [quality, setQuality] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const todayLog = sleepLogs.find((l) => l.date === todayKey());
  const goalMin = profile?.sleep_goal_min ?? 480;

  const durationPreview = useMemo(() => {
    let wake = wakeTime;
    if (wake <= bedtime) wake = new Date(wake.getTime() + 24 * 3600 * 1000);
    return Math.round((wake.getTime() - bedtime.getTime()) / 60000);
  }, [bedtime, wakeTime]);

  const weekData = useMemo(() => {
    const byDate = new Map(sleepLogs.map((l) => [l.date, l.duration_min]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return { label: format(d, 'EEEEE'), value: byDate.get(dateKey(d)) ?? 0, highlight: i === 6 };
    });
  }, [sleepLogs]);

  const weekLogs = sleepLogs.filter((l) => l.date >= daysAgoKey(7));
  const weekAvg = weekLogs.length
    ? Math.round(weekLogs.reduce((s, l) => s + l.duration_min, 0) / weekLogs.length)
    : null;

  // Consistency: how steady bedtimes were this week (lower spread = higher score)
  const consistency = useMemo(() => {
    if (weekLogs.length < 2) return null;
    const mins = weekLogs.map((l) => {
      const d = new Date(l.bedtime);
      let m = d.getHours() * 60 + d.getMinutes();
      if (m < 720) m += 1440; // treat post-midnight bedtimes as late-night
      return m;
    });
    const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
    const sd = Math.sqrt(mins.reduce((a, b) => a + (b - mean) ** 2, 0) / mins.length);
    return Math.max(0, Math.round(100 - (sd / 90) * 100));
  }, [weekLogs]);

  const insightLine = useMemo(() => {
    if (!weekLogs.length) return 'Log a few nights and Aurora will spot your sleep patterns.';
    if (consistency != null && consistency >= 80) return 'Your bedtime routine is impressively consistent. 🌙';
    if (weekAvg != null && weekAvg < goalMin - 45)
      return `You're averaging ${formatDuration(goalMin - weekAvg)} under your goal — an earlier wind-down could help.`;
    return 'Solid week of rest. Keep protecting that bedtime.';
  }, [weekLogs.length, consistency, weekAvg, goalMin]);

  const save = async () => {
    setSaving(true);
    try {
      await logSleep({ bedtime, wakeTime, quality });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Could not save sleep', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </Pressable>
        <AText variant="title">Sleep</AText>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <Card accent={palette.sleep}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              ['Last night', todayLog ? formatDuration(todayLog.duration_min) : '—'],
              ['Weekly avg', formatDuration(weekAvg)],
              ['Consistency', consistency != null ? `${consistency}%` : '—'],
            ].map(([label, value]) => (
              <View key={label} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <AText variant="display" style={{ fontSize: 22 }}>
                  {value}
                </AText>
                <AText variant="caption" style={{ fontSize: 11 }}>
                  {label}
                </AText>
              </View>
            ))}
          </View>
          <AText variant="body" style={{ marginTop: spacing.lg, textAlign: 'center', color: palette.sleep }}>
            {insightLine}
          </AText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ marginTop: spacing.xl }}>
        <Card>
          <AText variant="label" style={{ marginBottom: spacing.lg }}>
            {todayLog ? 'Update last night' : 'Log last night'}
          </AText>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TimeStepper label="Bedtime" value={bedtime} onChange={setBedtime} accent={palette.sleep} />
            <TimeStepper label="Woke up" value={wakeTime} onChange={setWakeTime} accent={palette.nutrition} />
          </View>
          <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
            <AText variant="body">
              That’s <AText variant="bodyBold" color={palette.sleep}>{formatDuration(durationPreview)}</AText> of sleep
            </AText>
          </View>
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            <AText variant="label">How did you feel?</AText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {['😫', '😕', '😐', '🙂', '🤩'].map((emoji, i) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setQuality(i + 1);
                  }}
                  style={[styles.quality, quality === i + 1 && styles.qualitySelected]}>
                  <AText style={{ fontSize: 22 }}>{emoji}</AText>
                </Pressable>
              ))}
            </View>
          </View>
          <Button title={todayLog ? 'Update sleep' : 'Save sleep'} onPress={save} loading={saving} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(500)} style={{ marginTop: spacing.xl }}>
        <Card>
          <AText variant="label" style={{ marginBottom: spacing.lg }}>
            Last 7 nights
          </AText>
          <BarChart
            data={weekData}
            color={palette.sleep}
            colorEnd={palette.sleepDeep}
            goal={goalMin}
            formatValue={(v) => formatDuration(v)}
          />
        </Card>
      </Animated.View>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <AText variant="label">History</AText>
        {sleepLogs.length === 0 ? (
          <AText variant="caption">No sleep logged yet.</AText>
        ) : (
          [...sleepLogs]
            .reverse()
            .slice(0, 10)
            .map((l) => (
              <View key={l.id} style={styles.logRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Ionicons name="moon" size={15} color={palette.sleep} />
                  <AText variant="bodyBold">{formatDuration(l.duration_min)}</AText>
                  <AText variant="caption">
                    {format(new Date(l.bedtime), 'h:mm a')} → {format(new Date(l.wake_time), 'h:mm a')}
                  </AText>
                </View>
                <AText variant="caption">{format(new Date(`${l.date}T12:00:00`), 'MMM d')}</AText>
              </View>
            ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quality: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
  },
  qualitySelected: { borderColor: palette.sleep, backgroundColor: 'rgba(167,139,250,0.12)' },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
