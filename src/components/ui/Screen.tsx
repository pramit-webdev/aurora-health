import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing } from '@/constants/theme';

interface Props extends PropsWithChildren {
  scroll?: boolean;
  style?: ViewStyle;
  /** extra bottom padding so content clears the floating tab bar */
  padBottom?: number;
  edgesTop?: boolean;
}

/** Base screen: deep navy bg with a faint aurora glow bleeding from the top. */
export function Screen({ children, scroll = true, style, padBottom = 120, edgesTop = true }: Props) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.content, { paddingTop: edgesTop ? insets.top + spacing.md : 0 }, style]}>
      {children}
    </View>
  );
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(79, 209, 197, 0.14)', 'rgba(129, 140, 248, 0.08)', 'transparent']}
        style={styles.glow}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        pointerEvents="none"
      />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: padBottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  content: { paddingHorizontal: spacing.xl, flexGrow: 1 },
});
