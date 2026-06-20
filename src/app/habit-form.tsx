import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAurora } from '@/lib/store';
import type { TimeOfDay } from '@/lib/types';
import { palette, spacing } from '@/constants/theme';
import { AText, Button, Chip, Input, Screen } from '@/components/ui';

const EMOJIS = ['📖', '🧘', '🤸', '🚶', '📓', '💊', '🌙', '🏃', '💪', '🎧', '🪥', '🧴', '☀️', '🍎'];
const SUGGESTIONS = [
  { name: 'Read 10 pages', emoji: '📖', time: 'evening' },
  { name: 'Meditate', emoji: '🧘', time: 'morning' },
  { name: 'Stretch', emoji: '🤸', time: 'morning' },
  { name: 'Walk 20 minutes', emoji: '🚶', time: 'afternoon' },
  { name: 'Journal', emoji: '📓', time: 'evening' },
  { name: 'Take supplements', emoji: '💊', time: 'morning' },
  { name: 'In bed by 11', emoji: '🌙', time: 'evening' },
] as const;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TIMES: { key: TimeOfDay; label: string }[] = [
  { key: 'morning', label: '🌅 Morning' },
  { key: 'afternoon', label: '☀️ Afternoon' },
  { key: 'evening', label: '🌆 Evening' },
  { key: 'anytime', label: '✨ Anytime' },
];

export default function HabitForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const habits = useAurora((s) => s.habits);
  const createHabit = useAurora((s) => s.createHabit);
  const updateHabit = useAurora((s) => s.updateHabit);

  const existing = id ? habits.find((h) => h.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '✨');
  const [time, setTime] = useState<TimeOfDay>(existing?.time_of_day ?? 'anytime');
  const [days, setDays] = useState<number[]>(existing?.days_of_week ?? [1, 2, 3, 4, 5, 6, 7]);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) => {
    Haptics.selectionAsync();
    setDays((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort();
      return next.length === 0 ? prev : next;
    });
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Give it a name', 'What habit are you building?');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateHabit(existing.id, { name: name.trim(), emoji, time_of_day: time, days_of_week: days });
      } else {
        await createHabit({ name: name.trim(), emoji, time_of_day: time, days_of_week: days });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save habit', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padBottom={spacing.xxl}>
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={palette.textPrimary} />
        </Pressable>
        <AText variant="title">{existing ? 'Edit habit' : 'New habit'}</AText>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {!existing && (
          <View style={{ gap: spacing.sm }}>
            <AText variant="label">Popular</AText>
            <View style={styles.chips}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s.name}
                  label={`${s.emoji} ${s.name}`}
                  selected={name === s.name}
                  onPress={() => {
                    setName(s.name);
                    setEmoji(s.emoji);
                    setTime(s.time as TimeOfDay);
                  }}
                  accent={palette.habit}
                />
              ))}
            </View>
          </View>
        )}

        <Input label="Habit name" value={name} onChangeText={setName} placeholder="e.g. Morning meditation" />

        <View style={{ gap: spacing.sm }}>
          <AText variant="label">Icon</AText>
          <View style={styles.chips}>
            {EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => {
                  Haptics.selectionAsync();
                  setEmoji(e);
                }}
                style={[styles.emoji, emoji === e && styles.emojiSelected]}>
                <AText style={{ fontSize: 20 }}>{e}</AText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AText variant="label">Time of day</AText>
          <View style={styles.chips}>
            {TIMES.map((t) => (
              <Chip key={t.key} label={t.label} selected={time === t.key} onPress={() => setTime(t.key)} accent={palette.habit} />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AText variant="label">Repeat on</AText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {DAYS.map((label, i) => {
              const d = i + 1;
              const selected = days.includes(d);
              return (
                <Pressable
                  key={`${label}-${i}`}
                  onPress={() => toggleDay(d)}
                  style={[styles.day, selected && { backgroundColor: `${palette.habit}22`, borderColor: palette.habit }]}>
                  <AText variant="bodyBold" style={{ fontSize: 13, color: selected ? palette.habit : palette.textTertiary }}>
                    {label}
                  </AText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button title={existing ? 'Save changes' : 'Create habit'} onPress={save} loading={saving} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emojiSelected: { borderColor: palette.habit, backgroundColor: 'rgba(52,211,153,0.1)' },
  day: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
});
