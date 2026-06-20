import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fonts, palette, radius, spacing } from '@/constants/theme';
import { AText } from './AText';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accent?: string;
  style?: ViewStyle;
}

export function Chip({ label, selected, onPress, accent = palette.auroraTeal, style }: Props) {
  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: `${accent}22`, borderColor: accent },
        pressed && { opacity: 0.7 },
        style,
      ]}>
      <AText
        style={{
          fontFamily: selected ? fonts.bodyBold : fonts.body,
          fontSize: 14,
          color: selected ? accent : palette.textSecondary,
        }}>
        {label}
      </AText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
});
