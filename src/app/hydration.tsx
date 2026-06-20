import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { useAurora, selectTodayStats } from '@/lib/store';
import { dateKey, formatMl, formatTimeShort } from '@/lib/dates';
import { palette, spacing } from '@/constants/theme';
import { AText, Button, Card, Input, Screen } from '@/components/ui';
import { WaterBottle } from '@/components/hydration/WaterBottle';
import { BarChart } from '@/components/charts/BarChart';
import { format, subDays } from 'date-fns';

const QUICK_ADDS = [
  { ml: 150, label: 'Glass', icon: '🥃' },
  { ml: 250, label: 'Cup', icon: '☕' },
  { ml: 500, label: 'Bottle', icon: '🍶' },
  { ml: 750, label: 'Large', icon: '🫙' },
];

export default function Hydration() {
  const stats = useAurora(useShallow(selectTodayStats));
  const todayWater = useAurora((s) => s.todayWater);
  const waterHistory = useAurora((s) => s.waterHistory);
  const addWater = useAurora((s) => s.addWater);
  const removeWaterLog = useAurora((s) => s.removeWaterLog);

  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const progress = stats.waterGoalMl > 0 ? stats.waterMl / stats.waterGoalMl : 0;

  const handleAdd = async (ml: number) => {
    if (!ml || ml <= 0 || busy) return;
    setBusy(true);
    try {
      await addWater(ml);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCustom('');
    } catch (e: any) {
      Alert.alert('Could not log water', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const weekData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const w of waterHistory) {
      const k = dateKey(new Date(w.logged_at));
      byDay.set(k, (byDay.get(k) ?? 0) + w.amount_ml);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const k = dateKey(d);
      return { label: format(d, 'EEEEE'), value: byDay.get(k) ?? 0, highlight: i === 6 };
    });
  }, [waterHistory]);

  const insightLine = useMemo(() => {
    if (progress >= 1) return 'Goal reached — your body thanks you. 💙';
    const hour = new Date().getHours();
    const expected = Math.min(Math.max((hour - 7) / 14, 0), 1);
    if (progress >= expected) return "You're ahead of today's hydration pace. Keep sipping!";
    return `You're a little behind pace — a ${formatMl(Math.min(500, stats.waterGoalMl - stats.waterMl))} glass would catch you up.`;
  }, [progress, stats]);

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </Pressable>
        <AText variant="title">Hydration</AText>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View entering={FadeInUp.duration(600)} style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <WaterBottle progress={progress} currentMl={stats.waterMl} goalMl={stats.waterGoalMl} />
        <AText variant="body" style={{ marginTop: spacing.lg, textAlign: 'center', color: palette.hydration }}>
          {insightLine}
        </AText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ marginTop: spacing.xxl, gap: spacing.md }}>
        <AText variant="label">Quick add</AText>
        <View style={styles.quickRow}>
          {QUICK_ADDS.map((q) => (
            <Pressable
              key={q.ml}
              onPress={() => handleAdd(q.ml)}
              style={({ pressed }) => [styles.quick, pressed && { transform: [{ scale: 0.95 }], opacity: 0.85 }]}>
              <AText style={{ fontSize: 24 }}>{q.icon}</AText>
              <AText variant="bodyBold" style={{ fontSize: 14 }}>
                {q.ml}ml
              </AText>
              <AText variant="caption" style={{ fontSize: 11 }}>
                {q.label}
              </AText>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Custom amount"
              value={custom}
              onChangeText={setCustom}
              placeholder="e.g. 330"
              keyboardType="number-pad"
              suffix="ml"
            />
          </View>
          <Button title="Add" small onPress={() => handleAdd(parseInt(custom, 10))} style={{ marginBottom: 2, height: 48 }} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={{ marginTop: spacing.xxl }}>
        <Card>
          <AText variant="label" style={{ marginBottom: spacing.lg }}>
            Last 7 days
          </AText>
          <BarChart
            data={weekData}
            color={palette.hydration}
            colorEnd={palette.hydrationDeep}
            goal={stats.waterGoalMl}
            formatValue={(v) => formatMl(v)}
          />
        </Card>
      </Animated.View>

      <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
        <AText variant="label">Today’s log</AText>
        {todayWater.length === 0 ? (
          <AText variant="caption">Nothing yet — your first glass is one tap away.</AText>
        ) : (
          todayWater.map((w) => (
            <View key={w.id} style={styles.logRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Ionicons name="water" size={16} color={palette.hydration} />
                <AText variant="bodyBold">{formatMl(w.amount_ml)}</AText>
                <AText variant="caption">{formatTimeShort(w.logged_at)}</AText>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Remove entry?', `Remove ${formatMl(w.amount_ml)} from today's log?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeWaterLog(w.id) },
                  ])
                }>
                <Ionicons name="close" size={16} color={palette.textTertiary} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickRow: { flexDirection: 'row', gap: spacing.md },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 18,
    paddingVertical: spacing.lg,
  },
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
