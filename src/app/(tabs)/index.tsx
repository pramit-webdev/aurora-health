import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import { useAurora, selectStreaks, selectTodayStats } from '@/lib/store';
import { greetingForNow } from '@/lib/dates';
import { generateDailyInsight } from '@/lib/ai';
import { palette, spacing } from '@/constants/theme';
import { AText } from '@/components/ui';
import {
  HabitsCard,
  HydrationCard,
  InsightCard,
  NutritionCard,
  SleepCard,
  StreakCard,
} from '@/components/dashboard/cards';

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const profile = useAurora((s) => s.profile);
  const insight = useAurora((s) => s.insight);
  const loaded = useAurora((s) => s.loaded);
  const stats = useAurora(useShallow(selectTodayStats));
  const streaks = useAurora(useShallow(selectStreaks));
  const loadAll = useAurora((s) => s.loadAll);
  const setInsight = useAurora((s) => s.setInsight);

  const [refreshing, setRefreshing] = useState(false);
  const [insightFailed, setInsightFailed] = useState(false);
  const insightRequested = useRef(false);

  // Generate today's insight once data is loaded and none exists yet
  useEffect(() => {
    if (!loaded || insight || insightRequested.current) return;
    insightRequested.current = true;
    generateDailyInsight()
      .then((i) => i && setInsight(i))
      .catch(() => setInsightFailed(true));
  }, [loaded, insight, setInsight]);

  const insightLoading = loaded && !insight && !insightFailed;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const firstName = profile?.name?.split(' ')[0] || 'there';

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <LinearGradient
        colors={['rgba(79, 209, 197, 0.14)', 'rgba(129, 140, 248, 0.07)', 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.auroraTeal} />
        }>
        <Animated.View entering={FadeInDown.duration(500)} style={{ gap: 2, marginBottom: spacing.xl }}>
          <AText variant="caption">{format(new Date(), 'EEEE, MMMM d')}</AText>
          <AText variant="display" style={{ fontSize: 28 }}>
            {greetingForNow()}, {firstName} <AText style={{ fontSize: 24 }}>👋</AText>
          </AText>
        </Animated.View>

        <View style={{ gap: spacing.md }}>
          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <InsightCard content={insight?.content ?? null} loading={insightLoading} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.row}>
            <HydrationCard stats={stats} />
            <SleepCard stats={stats} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.row}>
            <HabitsCard stats={stats} />
            <NutritionCard stats={stats} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <StreakCard streaks={streaks} />
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  row: { flexDirection: 'row', gap: spacing.md },
});
