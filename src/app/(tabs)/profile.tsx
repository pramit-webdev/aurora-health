import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@/lib/api';
import { syncNotifications } from '@/lib/notifications';
import { useAurora } from '@/lib/store';
import type { NotificationPrefs } from '@/lib/types';
import { auroraGradientWide, palette, spacing } from '@/constants/theme';
import { AText, Button, Card, Input, Screen } from '@/components/ui';
import { formatMl } from '@/lib/dates';

const GOAL_LABELS: Record<string, string> = {
  hydration: '💧 Hydration',
  sleep: '🌙 Better sleep',
  habits: '✅ Habits',
  nutrition: '🥗 Nutrition',
  energy: '⚡ Energy',
  consistency: '🔥 Consistency',
};

export default function Profile() {
  const profile = useAurora((s) => s.profile);
  const setProfile = useAurora((s) => s.setProfile);
  const reset = useAurora((s) => s.reset);
  const memories = useAurora((s) => s.memories);

  const [waterGoal, setWaterGoal] = useState(profile?.water_goal_ml?.toString() ?? '2500');
  const [editingGoal, setEditingGoal] = useState(false);

  const prefs: NotificationPrefs = profile?.notification_prefs ?? {
    hydration: true,
    sleep: true,
    habits: true,
    insights: true,
  };

  const togglePref = async (key: keyof NotificationPrefs) => {
    if (!profile) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setProfile({ ...profile, notification_prefs: next });
    try {
      const updated = await updateProfile({ notification_prefs: next });
      syncNotifications(updated).catch(() => {});
    } catch {
      setProfile(profile);
    }
  };

  const saveWaterGoal = async () => {
    const ml = parseInt(waterGoal, 10);
    if (!ml || ml < 500 || ml > 6000) {
      Alert.alert('Hmm', 'Pick a goal between 500ml and 6000ml.');
      return;
    }
    try {
      const updated = await updateProfile({ water_goal_ml: ml });
      setProfile(updated);
      setEditingGoal(false);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    }
  };

  const signOut = () => {
    Alert.alert('Sign out?', 'Your data stays safe in your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          reset();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const initials = (profile?.name ?? 'A')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Screen>
      <AText variant="title">Profile</AText>

      <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: spacing.xl }}>
        <Card style={{ alignItems: 'center', gap: spacing.sm }}>
          <LinearGradient colors={[...auroraGradientWide]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <AText variant="display" style={{ fontSize: 26, color: palette.textOnAccent }}>
              {initials}
            </AText>
          </LinearGradient>
          <AText variant="heading" style={{ fontSize: 20 }}>
            {profile?.name ?? 'Friend'}
          </AText>
          <View style={styles.goalChips}>
            {(profile?.goals ?? []).map((g) => (
              <View key={g} style={styles.goalChip}>
                <AText variant="caption" style={{ fontSize: 12 }}>
                  {GOAL_LABELS[g] ?? g}
                </AText>
              </View>
            ))}
          </View>
          <Button title="Edit profile & goals" variant="secondary" small onPress={() => router.push('/setup')} style={{ marginTop: spacing.sm }} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginTop: spacing.md }}>
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <AText variant="bodyBold">Daily water goal</AText>
              <AText variant="caption">{formatMl(profile?.water_goal_ml ?? 2500)} per day</AText>
            </View>
            <Pressable onPress={() => setEditingGoal((v) => !v)} hitSlop={10}>
              <Ionicons name={editingGoal ? 'close' : 'pencil'} size={18} color={palette.textSecondary} />
            </Pressable>
          </View>
          {editingGoal && (
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input value={waterGoal} onChangeText={setWaterGoal} keyboardType="number-pad" suffix="ml" />
              </View>
              <Button title="Save" small onPress={saveWaterGoal} />
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(500)} style={{ marginTop: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          <AText variant="label">Notifications</AText>
          {(
            [
              ['hydration', '💧 Hydration reminders'],
              ['sleep', '🌙 Sleep reminders'],
              ['habits', '✅ Habit reminders'],
              ['insights', '✨ Daily insights'],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.rowBetween}>
              <AText variant="body" style={{ color: palette.textPrimary }}>
                {label}
              </AText>
              <Switch
                value={prefs[key]}
                onValueChange={() => togglePref(key)}
                trackColor={{ false: palette.surfaceRaised, true: `${palette.auroraTeal}88` }}
                thumbColor={prefs[key] ? palette.auroraTeal : palette.textTertiary}
              />
            </View>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(500)} style={{ marginTop: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="sparkles" size={14} color={palette.auroraViolet} />
            <AText variant="label">What Aurora remembers about you</AText>
          </View>
          {memories.length === 0 ? (
            <AText variant="caption">
              As you talk with Aurora, it learns your patterns and keeps gentle notes here.
            </AText>
          ) : (
            memories.slice(0, 6).map((m) => (
              <View key={m.id} style={styles.memoryRow}>
                <AText variant="caption" style={{ color: palette.textSecondary, flex: 1, lineHeight: 18 }}>
                  {m.content}
                </AText>
              </View>
            ))
          )}
        </Card>
      </Animated.View>

      <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
        <Button title="Sign out" variant="danger" onPress={signOut} />
        <AText variant="caption" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          Aurora v1.0 · your data is yours, always
        </AText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  goalChip: {
    backgroundColor: palette.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memoryRow: {
    backgroundColor: 'rgba(167,139,250,0.06)',
    borderRadius: 10,
    padding: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(167,139,250,0.4)',
  },
});
