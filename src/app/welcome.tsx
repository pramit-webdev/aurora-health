import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuroraOrb } from '@/components/AuroraOrb';
import { AText, Button, Screen } from '@/components/ui';
import { palette, spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

const PAGES: { title: string; body: string; colors: [string, string] }[] = [
  {
    title: 'Meet Aurora,\nyour health companion',
    body: 'A personal companion that listens, understands, and helps you feel your best — every single day.',
    colors: ['#4FD1C5', '#818CF8'],
  },
  {
    title: 'Track what\nactually matters',
    body: 'Hydration, sleep, habits, and nutrition — logged in seconds, by tap or just by talking.',
    colors: ['#38BDF8', '#6366F1'],
  },
  {
    title: 'Insights made\njust for you',
    body: 'Aurora studies your patterns and tells you what your data really means — and what to do next.',
    colors: ['#A78BFA', '#F0ABFC'],
  },
  {
    title: 'Small habits,\nbig change',
    body: 'Build healthier routines through gentle streaks and encouragement — never pressure.',
    colors: ['#34D399', '#4FD1C5'],
  },
  {
    title: 'Learn more about\nyourself every day',
    body: 'The longer you use Aurora, the better it understands you. Ready when you are.',
    colors: ['#FB923C', '#F472B6'],
  },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList>(null);
  const isLast = page === PAGES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0 }} padBottom={0}>
      <Animated.View entering={FadeInDown.duration(700)} style={[styles.header, { paddingTop: spacing.md }]}>
        <AText variant="label" style={{ color: palette.auroraTeal }}>
          Aurora
        </AText>
        <AText variant="body" style={styles.tagline}>
          Understand yourself better every day.
        </AText>
      </Animated.View>

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(p) => p.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <AuroraOrb size={260} colors={item.colors} />
            <AText variant="display" style={styles.title}>
              {item.title}
            </AText>
            <AText variant="body" style={styles.body}>
              {item.body}
            </AText>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === page && { width: 22, backgroundColor: palette.auroraTeal },
              ]}
            />
          ))}
        </View>
        <Button
          title={isLast ? 'Get started' : 'Continue'}
          onPress={() => {
            if (isLast) router.push('/(auth)/sign-up');
            else listRef.current?.scrollToIndex({ index: page + 1, animated: true });
          }}
        />
        <Button
          title={isLast ? 'I already have an account' : 'Skip'}
          variant="ghost"
          onPress={() => router.push(isLast ? '/(auth)/sign-in' : '/(auth)/sign-up')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xl },
  tagline: { color: palette.textSecondary },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  title: { textAlign: 'center', fontSize: 30, lineHeight: 38 },
  body: { textAlign: 'center', maxWidth: 320 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.md },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148,163,184,0.3)',
  },
});
