import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { palette, radius, shadows, spacing } from '@/constants/theme';

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** subtle tinted glow border, e.g. module accent color */
  accent?: string;
}

// Layout props must live on the outermost element (the Pressable when the
// card is tappable) or flex rows size cards to their content and overflow.
const LAYOUT_KEYS = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical',
] as const;

function splitStyle(style?: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  const flat = StyleSheet.flatten(style) ?? {};
  for (const [key, value] of Object.entries(flat)) {
    if ((LAYOUT_KEYS as readonly string[]).includes(key)) outer[key] = value;
    else inner[key] = value;
  }
  return { outer, inner };
}

export function Card({ children, style, onPress, accent }: CardProps) {
  const { outer, inner } = splitStyle(style);
  const body = (innerStyle: ViewStyle) => (
    <View
      style={[
        styles.card,
        accent ? { borderColor: `${accent}33` } : null,
        innerStyle,
      ]}>
      {accent ? (
        <LinearGradient
          colors={[`${accent}14`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
  if (!onPress) return body({ ...outer, ...inner });
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [outer, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}>
      {body(inner)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
});
