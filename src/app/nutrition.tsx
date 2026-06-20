import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { useAurora, selectTodayStats } from '@/lib/store';
import { parseMeal } from '@/lib/ai';
import type { MealType } from '@/lib/types';
import { formatTimeShort } from '@/lib/dates';
import { palette, spacing } from '@/constants/theme';
import { AText, Button, Card, Chip, Input, Screen } from '@/components/ui';

const MEAL_TYPES: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', emoji: '🍲' },
  { key: 'snack', label: 'Snack', emoji: '🍎' },
];

export default function Nutrition() {
  const stats = useAurora(useShallow(selectTodayStats));
  const todayMeals = useAurora((s) => s.todayMeals);
  const addMeal = useAurora((s) => s.addMeal);
  const removeMeal = useAurora((s) => s.removeMeal);

  const [mealType, setMealType] = useState<MealType>(() => {
    const h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 20) return 'dinner';
    return 'snack';
  });
  const [description, setDescription] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [macros, setMacros] = useState<{ calories: number; protein_g: number; carbs_g: number; fat_g: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const estimate = async () => {
    if (!description.trim()) {
      Alert.alert('Describe your meal', 'e.g. "2 eggs, toast with butter, and a coffee"');
      return;
    }
    setEstimating(true);
    try {
      const parsed = await parseMeal(description.trim());
      setMacros({
        calories: parsed.calories,
        protein_g: parsed.protein_g,
        carbs_g: parsed.carbs_g,
        fat_g: parsed.fat_g,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Estimation failed', e?.message ?? 'You can still log the meal without macros.');
    } finally {
      setEstimating(false);
    }
  };

  const save = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await addMeal({
        meal_type: mealType,
        description: description.trim(),
        calories: macros?.calories ?? 0,
        protein_g: macros?.protein_g ?? 0,
        carbs_g: macros?.carbs_g ?? 0,
        fat_g: macros?.fat_g ?? 0,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDescription('');
      setMacros(null);
    } catch (e: any) {
      Alert.alert('Could not log meal', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(
    () => MEAL_TYPES.map((t) => ({ ...t, meals: todayMeals.filter((m) => m.meal_type === t.key) })).filter((g) => g.meals.length),
    [todayMeals],
  );

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </Pressable>
        <AText variant="title">Nutrition</AText>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: spacing.xl }}>
        <Card accent={palette.nutrition}>
          <View style={{ flexDirection: 'row' }}>
            {(
              [
                ['Calories', `${stats.calories}`, 'kcal'],
                ['Protein', `${stats.protein_g}`, 'g'],
                ['Carbs', `${stats.carbs_g}`, 'g'],
                ['Fat', `${stats.fat_g}`, 'g'],
              ] as const
            ).map(([label, value, unit]) => (
              <View key={label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <AText variant="display" style={{ fontSize: 20 }}>
                  {value}
                  <AText variant="caption"> {unit}</AText>
                </AText>
                <AText variant="caption" style={{ fontSize: 11 }}>
                  {label}
                </AText>
              </View>
            ))}
          </View>
          <AText variant="caption" style={{ textAlign: 'center', marginTop: spacing.md }}>
            Awareness over counting — just notice your patterns. 🌿
          </AText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ marginTop: spacing.xl }}>
        <Card>
          <AText variant="label" style={{ marginBottom: spacing.md }}>
            Log a meal
          </AText>
          <View style={[styles.chips, { marginBottom: spacing.lg }]}>
            {MEAL_TYPES.map((t) => (
              <Chip
                key={t.key}
                label={`${t.emoji} ${t.label}`}
                selected={mealType === t.key}
                onPress={() => setMealType(t.key)}
                accent={palette.nutrition}
              />
            ))}
          </View>
          <Input
            value={description}
            onChangeText={(t) => {
              setDescription(t);
              setMacros(null);
            }}
            placeholder='Describe it — "dal, rice and salad"'
            multiline
          />
          {macros && (
            <View style={styles.macroPreview}>
              <Ionicons name="sparkles" size={13} color={palette.nutrition} />
              <AText variant="caption" style={{ color: palette.textSecondary, flex: 1 }}>
                ~{macros.calories} kcal · {macros.protein_g}g protein · {macros.carbs_g}g carbs · {macros.fat_g}g fat
              </AText>
            </View>
          )}
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button
              title={estimating ? 'Estimating…' : '✨ Estimate macros'}
              variant="secondary"
              small
              onPress={estimate}
              loading={estimating}
            />
            <Button title="Log meal" small onPress={save} loading={saving} />
          </View>
        </Card>
      </Animated.View>

      <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
        {grouped.length === 0 ? (
          <AText variant="caption" style={{ textAlign: 'center', marginTop: spacing.lg }}>
            No meals logged today yet.
          </AText>
        ) : (
          grouped.map((g) => (
            <View key={g.key} style={{ gap: spacing.sm }}>
              <AText variant="label">
                {g.emoji} {g.label}
              </AText>
              {g.meals.map((m) => (
                <View key={m.id} style={styles.mealRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AText variant="bodyBold">{m.description}</AText>
                    <AText variant="caption" style={{ fontSize: 11 }}>
                      {m.calories > 0
                        ? `${m.calories} kcal · P ${m.protein_g}g · C ${m.carbs_g}g · F ${m.fat_g}g`
                        : 'macros not estimated'}
                      {'  ·  '}
                      {formatTimeShort(m.logged_at)}
                    </AText>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert('Remove meal?', m.description, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeMeal(m.id) },
                      ])
                    }>
                    <Ionicons name="close" size={16} color={palette.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macroPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 10,
    padding: spacing.md,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
});
