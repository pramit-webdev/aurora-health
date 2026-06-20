import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useAurora, habitsDueToday, habitStreak } from '@/lib/store';
import { todayKey } from '@/lib/dates';
import type { Habit } from '@/lib/types';
import { palette, spacing } from '@/constants/theme';
import { AText, Button, Card, Screen } from '@/components/ui';

const TIME_LABEL: Record<Habit['time_of_day'], string> = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌆 Evening',
  anytime: '✨ Anytime',
};

interface SheetOption {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}

/** Bottom sheet for habit options — native alerts cap at 3 buttons on Android. */
function OptionsSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <AText variant="heading" style={{ textAlign: 'center', marginBottom: spacing.md }}>
            {title}
          </AText>
          {options.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
                opt.onPress();
              }}
              style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: palette.surfaceRaised }]}>
              <Ionicons
                name={opt.icon}
                size={19}
                color={opt.danger ? palette.danger : palette.textSecondary}
              />
              <AText variant="bodyBold" color={opt.danger ? palette.danger : palette.textPrimary}>
                {opt.label}
              </AText>
            </Pressable>
          ))}
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function HabitRow({ habit }: { habit: Habit }) {
  const habitLogs = useAurora((s) => s.habitLogs);
  const setHabitStatus = useAurora((s) => s.setHabitStatus);
  const clearHabitStatus = useAurora((s) => s.clearHabitStatus);
  const updateHabit = useAurora((s) => s.updateHabit);
  const deleteHabit = useAurora((s) => s.deleteHabit);

  const todayLog = habitLogs.find((l) => l.habit_id === habit.id && l.date === todayKey());
  const streak = habitStreak(habit, habitLogs);
  const paused = habit.status === 'paused';

  const toggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (todayLog?.status === 'completed') await clearHabitStatus(habit.id);
    else await setHabitStatus(habit.id, 'completed');
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const showOptions = () => setSheetOpen(true);

  const sheetOptions: SheetOption[] = [
    todayLog?.status === 'skipped'
      ? { icon: 'play', label: 'Unskip today', onPress: () => clearHabitStatus(habit.id) }
      : { icon: 'play-skip-forward', label: 'Skip today', onPress: () => setHabitStatus(habit.id, 'skipped') },
    {
      icon: paused ? 'play-circle' : 'pause-circle',
      label: paused ? 'Resume habit' : 'Pause habit',
      onPress: () => updateHabit(habit.id, { status: paused ? 'active' : 'paused' }),
    },
    {
      icon: 'pencil',
      label: 'Edit',
      onPress: () => router.push({ pathname: '/habit-form', params: { id: habit.id } }),
    },
    {
      icon: 'trash',
      label: 'Delete',
      danger: true,
      onPress: () =>
        Alert.alert('Delete habit?', `"${habit.name}" and its history will be removed.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
        ]),
    },
  ];

  const completed = todayLog?.status === 'completed';
  const skipped = todayLog?.status === 'skipped';

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)}>
      <OptionsSheet visible={sheetOpen} title={habit.name} options={sheetOptions} onClose={() => setSheetOpen(false)} />
      <Pressable onPress={paused ? showOptions : toggle} onLongPress={showOptions} delayLongPress={350}>
        <View style={[styles.row, paused && { opacity: 0.5 }, completed && styles.rowDone]}>
          <View style={[styles.checkCircle, completed && styles.checkDone, skipped && styles.checkSkipped]}>
            {completed ? (
              <Ionicons name="checkmark" size={16} color={palette.textOnAccent} />
            ) : skipped ? (
              <Ionicons name="play-skip-forward" size={12} color={palette.textTertiary} />
            ) : null}
          </View>
          <AText style={{ fontSize: 20 }}>{habit.emoji}</AText>
          <View style={{ flex: 1, gap: 1 }}>
            <AText
              variant="bodyBold"
              style={completed ? { textDecorationLine: 'line-through', color: palette.textSecondary } : undefined}>
              {habit.name}
            </AText>
            <AText variant="caption" style={{ fontSize: 11 }}>
              {TIME_LABEL[habit.time_of_day]}
              {paused ? ' · paused' : skipped ? ' · skipped today' : ''}
              {habit.days_of_week.length < 7 ? ` · ${habit.days_of_week.length}×/week` : ''}
            </AText>
          </View>
          {streak > 1 && (
            <View style={styles.streakPill}>
              <AText variant="caption" style={{ color: palette.streak, fontSize: 12 }}>
                🔥 {streak}
              </AText>
            </View>
          )}
          <Pressable onPress={showOptions} hitSlop={10}>
            <Ionicons name="ellipsis-horizontal" size={18} color={palette.textTertiary} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function useHabitInsight(habits: Habit[], logs: { habit_id: string; status: string }[]): string | null {
  return useMemo(() => {
    if (!habits.length) return null;
    const active = habits.filter((h) => h.status === 'active');
    // Best current streak
    const streaks = active
      .map((h) => ({ h, s: habitStreak(h, logs as never) }))
      .sort((a, b) => b.s - a.s);
    if (streaks[0] && streaks[0].s >= 3) {
      return `🔥 “${streaks[0].h.name}” is on a ${streaks[0].s}-day run — your most consistent habit.`;
    }
    // Completion rate by time of day
    const byTime = new Map<string, { done: number; total: number }>();
    for (const h of active) {
      const slot = byTime.get(h.time_of_day) ?? { done: 0, total: 0 };
      const completions = logs.filter((l) => l.habit_id === h.id && l.status === 'completed').length;
      slot.done += completions;
      slot.total += 1;
      byTime.set(h.time_of_day, slot);
    }
    const ranked = [...byTime.entries()]
      .filter(([, v]) => v.done > 0)
      .sort((a, b) => b[1].done / b[1].total - a[1].done / a[1].total);
    if (ranked.length >= 2) {
      const label = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Flexible' }[ranked[0][0]];
      return `✨ ${label} habits are your strong suit — you complete them most consistently.`;
    }
    return null;
  }, [habits, logs]);
}

export default function Habits() {
  const habits = useAurora((s) => s.habits);
  const habitLogs = useAurora((s) => s.habitLogs);
  const insight = useHabitInsight(habits, habitLogs);

  const due = useMemo(() => habitsDueToday(habits), [habits]);
  const today = todayKey();
  const doneCount = due.filter((h) =>
    habitLogs.some((l) => l.habit_id === h.id && l.date === today && l.status === 'completed'),
  ).length;

  const notToday = habits.filter((h) => !due.includes(h));

  return (
    <Screen>
      <View style={styles.titleRow}>
        <View>
          <AText variant="title">Habits</AText>
          <AText variant="caption" style={{ marginTop: 2 }}>
            {due.length === 0
              ? 'Build your first routine'
              : `${doneCount} of ${due.length} done today`}
          </AText>
        </View>
        <Button title="+ New" small onPress={() => router.push('/habit-form')} />
      </View>

      {insight && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.insightBar}>
          <AText variant="caption" style={{ color: palette.habit, lineHeight: 18 }}>
            {insight}
          </AText>
        </Animated.View>
      )}

      {habits.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: spacing.xxl }}>
          <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl }}>
            <AText style={{ fontSize: 40 }}>🌱</AText>
            <AText variant="heading">Small habits, big change</AText>
            <AText variant="body" style={{ textAlign: 'center' }}>
              Start with one tiny habit — meditate, stretch, read. Aurora will help you stay consistent.
            </AText>
            <Button title="Create your first habit" onPress={() => router.push('/habit-form')} style={{ marginTop: spacing.sm }} />
          </Card>
        </Animated.View>
      ) : (
        <>
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <AText variant="label">Today</AText>
            {due.length === 0 ? (
              <AText variant="caption">Nothing scheduled today — enjoy the rest 🌤️</AText>
            ) : (
              due.map((h) => <HabitRow key={h.id} habit={h} />)
            )}
          </View>
          {notToday.length > 0 && (
            <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
              <AText variant="label">Other days</AText>
              {notToday.map((h) => (
                <HabitRow key={h.id} habit={h} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  rowDone: { borderColor: 'rgba(52,211,153,0.35)', backgroundColor: 'rgba(52,211,153,0.06)' },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: palette.habit, borderColor: palette.habit },
  checkSkipped: { borderStyle: 'dashed' },
  streakPill: {
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  insightBar: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(52,211,153,0.5)',
    padding: spacing.md,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 18, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 2,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
    marginBottom: spacing.md,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
});
