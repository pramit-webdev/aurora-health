import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { updateProfile } from '@/lib/api';
import { syncNotifications } from '@/lib/notifications';
import { useAurora } from '@/lib/store';
import type { ActivityLevel, Gender, HealthGoal, NotificationPrefs } from '@/lib/types';
import { AText, Button, Chip, Input, ProgressBar, Screen } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';

const STEPS = ['About you', 'Your rhythm', 'Your goals', 'How you track', 'Stay on track'] as const;

const GOAL_OPTIONS: { key: HealthGoal; label: string; emoji: string }[] = [
  { key: 'hydration', label: 'Improve hydration', emoji: '💧' },
  { key: 'sleep', label: 'Sleep better', emoji: '🌙' },
  { key: 'habits', label: 'Build better habits', emoji: '✅' },
  { key: 'nutrition', label: 'Eat healthier', emoji: '🥗' },
  { key: 'energy', label: 'Improve energy', emoji: '⚡' },
  { key: 'consistency', label: 'Be more consistent', emoji: '🔥' },
];

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Mostly sitting' },
  { key: 'light', label: 'Light', desc: '1–2 workouts / week' },
  { key: 'moderate', label: 'Moderate', desc: '3–4 workouts / week' },
  { key: 'very_active', label: 'Very active', desc: 'Training most days' },
];

const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const WAKE_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '09:00'];
const BED_TIMES = ['21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '01:00'];

export default function Setup() {
  const setProfileInStore = useAurora((s) => s.setProfile);
  const existing = useAurora((s) => s.profile);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(existing?.name ?? '');
  const [age, setAge] = useState(existing?.age?.toString() ?? '');
  const [gender, setGender] = useState<Gender | null>(existing?.gender ?? null);
  const [height, setHeight] = useState(existing?.height_cm?.toString() ?? '');
  const [weight, setWeight] = useState(existing?.weight_kg?.toString() ?? '');

  const [wakeTime, setWakeTime] = useState(existing?.wake_time ?? '07:00');
  const [bedTime, setBedTime] = useState(existing?.bed_time ?? '23:00');
  const [activity, setActivity] = useState<ActivityLevel>(existing?.activity_level ?? 'light');

  const [goals, setGoals] = useState<HealthGoal[]>(existing?.goals ?? []);

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    hydration: true,
    sleep: true,
    habits: true,
    insights: true,
  });

  // Personalized hydration goal: ~33ml per kg, nudged by activity level
  const waterGoal = useMemo(() => {
    const kg = parseFloat(weight) || 65;
    const activityBump = { sedentary: 0, light: 150, moderate: 350, very_active: 600 }[activity];
    return Math.min(Math.max(Math.round((kg * 33 + activityBump) / 50) * 50, 1500), 4500);
  }, [weight, activity]);

  const canContinue =
    step === 0 ? name.trim().length > 0 : step === 2 ? goals.length > 0 : true;

  const finish = async () => {
    setSaving(true);
    try {
      const profile = await updateProfile({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        gender,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        wake_time: wakeTime,
        bed_time: bedTime,
        activity_level: activity,
        goals,
        notification_prefs: prefs,
        water_goal_ml: waterGoal,
        sleep_goal_min: 480,
        onboarding_complete: true,
      });
      setProfileInStore(profile);
      syncNotifications(profile).catch(() => {});
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('[setup] save failed:', e?.message, JSON.stringify(e));
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = (g: HealthGoal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <Screen padBottom={spacing.xl}>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
        <AText variant="label" style={{ color: palette.auroraTeal }}>
          Step {step + 1} of {STEPS.length}
        </AText>
        <ProgressBar progress={(step + 1) / STEPS.length} color={palette.auroraTeal} colorEnd={palette.auroraIndigo} height={6} />
        <AText variant="display" style={{ fontSize: 28, marginTop: spacing.md }}>
          {STEPS[step]}
        </AText>
      </View>

      {step === 0 && (
        <Animated.View key="s0" entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(200)} style={styles.stepBody}>
          <Input label="Name" value={name} onChangeText={setName} placeholder="What should Aurora call you?" autoCapitalize="words" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Age" value={age} onChangeText={setAge} placeholder="25" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Height" value={height} onChangeText={setHeight} placeholder="175" keyboardType="decimal-pad" suffix="cm" />
            </View>
          </View>
          <Input label="Weight" value={weight} onChangeText={setWeight} placeholder="68" keyboardType="decimal-pad" suffix="kg" />
          <View style={{ gap: spacing.sm }}>
            <AText variant="label">Gender</AText>
            <View style={styles.chips}>
              {GENDERS.map((g) => (
                <Chip key={g.key} label={g.label} selected={gender === g.key} onPress={() => setGender(g.key)} />
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      {step === 1 && (
        <Animated.View key="s1" entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(200)} style={styles.stepBody}>
          <View style={{ gap: spacing.sm }}>
            <AText variant="label">I usually wake up around</AText>
            <View style={styles.chips}>
              {WAKE_TIMES.map((t) => (
                <Chip key={t} label={t} selected={wakeTime === t} onPress={() => setWakeTime(t)} accent={palette.nutrition} />
              ))}
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <AText variant="label">I usually go to bed around</AText>
            <View style={styles.chips}>
              {BED_TIMES.map((t) => (
                <Chip key={t} label={t} selected={bedTime === t} onPress={() => setBedTime(t)} accent={palette.sleep} />
              ))}
            </View>
          </View>
          <View style={{ gap: spacing.sm }}>
            <AText variant="label">Activity level</AText>
            <View style={{ gap: spacing.sm }}>
              {ACTIVITY_OPTIONS.map((a) => (
                <Pressable
                  key={a.key}
                  onPress={() => setActivity(a.key)}
                  style={[
                    styles.option,
                    { flexDirection: 'column', alignItems: 'flex-start' },
                    activity === a.key && styles.optionSelected,
                  ]}>
                  <AText variant="bodyBold" color={activity === a.key ? palette.auroraTeal : palette.textPrimary}>
                    {a.label}
                  </AText>
                  <AText variant="caption">{a.desc}</AText>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View key="s2" entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(200)} style={styles.stepBody}>
          <AText variant="body">Choose what matters to you. Aurora personalizes everything around these.</AText>
          <View style={{ gap: spacing.sm }}>
            {GOAL_OPTIONS.map((g) => {
              const selected = goals.includes(g.key);
              return (
                <Pressable key={g.key} onPress={() => toggleGoal(g.key)} style={[styles.option, selected && styles.optionSelected]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <AText style={{ fontSize: 22 }}>{g.emoji}</AText>
                    <AText variant="bodyBold" color={selected ? palette.auroraTeal : palette.textPrimary}>
                      {g.label}
                    </AText>
                  </View>
                  <View style={[styles.check, selected && { backgroundColor: palette.auroraTeal, borderColor: palette.auroraTeal }]}>
                    {selected ? <AText style={{ color: palette.textOnAccent, fontSize: 12 }}>✓</AText> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      )}

      {step === 3 && (
        <Animated.View key="s3" entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(200)} style={styles.stepBody}>
          <AText variant="body">Choose how you want to track your health. You can change this anytime.</AText>
          <Pressable style={[styles.option, { flexDirection: 'column', alignItems: 'flex-start' }, styles.optionSelected]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <AText style={{ fontSize: 22 }}>✍️</AText>
              <AText variant="bodyBold" color={palette.auroraTeal}>
                Track manually
              </AText>
            </View>
            <AText variant="caption" style={{ marginTop: 4 }}>
              Log water, sleep, habits, and meals in seconds — by tap or just by telling Aurora.
            </AText>
          </Pressable>
          <Pressable style={[styles.option, { flexDirection: 'column', alignItems: 'flex-start', opacity: 0.55 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <AText style={{ fontSize: 22 }}>⌚</AText>
              <AText variant="bodyBold">Sync from devices</AText>
              <View style={styles.soonPill}>
                <AText variant="caption" style={{ fontSize: 10, color: palette.nutrition }}>
                  COMING SOON
                </AText>
              </View>
            </View>
            <AText variant="caption" style={{ marginTop: 4 }}>
              Health Connect, Fitbit and Garmin integration is on our roadmap.
            </AText>
          </Pressable>
        </Animated.View>
      )}

      {step === 4 && (
        <Animated.View key="s4" entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(200)} style={styles.stepBody}>
          <AText variant="body">
            Gentle nudges, never nagging. Based on your weight and activity, Aurora set your daily water goal to{' '}
            <AText variant="bodyBold" color={palette.hydration}>
              {waterGoal} ml
            </AText>
            . You can change it anytime.
          </AText>
          <View style={{ gap: spacing.sm }}>
            {(
              [
                ['hydration', 'Hydration reminders', '💧'],
                ['sleep', 'Sleep reminders', '🌙'],
                ['habits', 'Habit reminders', '✅'],
                ['insights', 'Daily insights', '✨'],
              ] as const
            ).map(([key, label, emoji]) => (
              <View key={key} style={[styles.option, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <AText style={{ fontSize: 20 }}>{emoji}</AText>
                  <AText variant="bodyBold">{label}</AText>
                </View>
                <Switch
                  value={prefs[key]}
                  onValueChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                  trackColor={{ false: palette.surfaceRaised, true: `${palette.auroraTeal}88` }}
                  thumbColor={prefs[key] ? palette.auroraTeal : palette.textTertiary}
                />
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <View style={{ gap: spacing.md, marginTop: 'auto', paddingTop: spacing.xl }}>
        <Button
          title={step === STEPS.length - 1 ? "Let's begin" : 'Continue'}
          onPress={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}
          disabled={!canContinue}
          loading={saving}
        />
        {step > 0 && <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepBody: { gap: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionSelected: { borderColor: palette.auroraTeal, backgroundColor: 'rgba(79,209,197,0.08)' },
  soonPill: {
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
