import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAurora } from '@/lib/store';
import { syncNotifications } from '@/lib/notifications';
import { auroraGradient, palette, radius, shadows } from '@/constants/theme';
import { AText } from '@/components/ui';

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { active: 'home', inactive: 'home-outline', label: 'Home' },
  habits: { active: 'checkmark-circle', inactive: 'checkmark-circle-outline', label: 'Habits' },
  trends: { active: 'stats-chart', inactive: 'stats-chart-outline', label: 'Trends' },
  profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

function AuroraTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TAB_ICONS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const icon = TAB_ICONS[route.name];
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate(route.name as never);
        }}
        style={styles.tab}>
        <Ionicons
          name={focused ? icon.active : icon.inactive}
          size={23}
          color={focused ? palette.auroraTeal : palette.textTertiary}
        />
        <AText variant="caption" style={{ fontSize: 10, color: focused ? palette.auroraTeal : palette.textTertiary }}>
          {icon.label}
        </AText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {left.map(renderTab)}
        <View style={styles.micSlot}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/companion');
            }}
            style={({ pressed }) => [styles.mic, pressed && { transform: [{ scale: 0.94 }] }]}>
            <LinearGradient colors={[...auroraGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.micGradient}>
              <Ionicons name="mic" size={26} color={palette.textOnAccent} />
            </LinearGradient>
          </Pressable>
        </View>
        {right.map(renderTab)}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const loadAll = useAurora((s) => s.loadAll);
  useEffect(() => {
    loadAll()
      .then(() => syncNotifications(useAurora.getState().profile))
      .catch(() => {});
  }, [loadAll]);

  return (
    <Tabs tabBar={(props) => <AuroraTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="habits" />
      <Tabs.Screen name="trends" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.97)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 16,
    gap: 2,
    ...shadows.card,
  },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 2, width: 62, paddingVertical: 6 },
  micSlot: { width: 72, alignItems: 'center' },
  mic: { marginTop: -26, borderRadius: radius.full, ...shadows.glow(palette.auroraIndigo) },
  micGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.bg,
  },
});
