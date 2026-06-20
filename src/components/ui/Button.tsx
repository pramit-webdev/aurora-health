import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { auroraGradient, fonts, palette, radius, spacing } from '@/constants/theme';
import { AText } from './AText';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, small }: Props) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const height = small ? 40 : 54;
  const textStyle = {
    fontFamily: fonts.bodyBold,
    fontSize: small ? 14 : 16,
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          { borderRadius: radius.full, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
          pressed && { transform: [{ scale: 0.98 }] },
          style,
        ]}>
        <LinearGradient
          colors={[...auroraGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, { height }]}>
          {loading ? (
            <ActivityIndicator color={palette.textOnAccent} />
          ) : (
            <AText style={[textStyle, { color: palette.textOnAccent }]}>{title}</AText>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'secondary'
      ? { backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.borderStrong }
      : variant === 'danger'
        ? { backgroundColor: 'rgba(248,113,113,0.12)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)' }
        : { backgroundColor: 'transparent' };

  const textColor =
    variant === 'danger' ? palette.danger : variant === 'ghost' ? palette.textSecondary : palette.textPrimary;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { height },
        variantStyle,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AText style={[textStyle, { color: textColor }]}>{title}</AText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
