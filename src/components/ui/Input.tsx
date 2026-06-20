import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fonts, palette, radius, spacing } from '@/constants/theme';
import { AText } from './AText';

interface Props extends TextInputProps {
  label?: string;
  suffix?: string;
}

export function Input({ label, suffix, style, ...rest }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <AText variant="label">{label}</AText> : null}
      <View style={styles.wrap}>
        <TextInput
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.auroraTeal}
          {...rest}
          style={[styles.input, style]}
        />
        {suffix ? (
          <AText variant="caption" style={{ marginRight: spacing.lg }}>
            {suffix}
          </AText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: palette.textPrimary,
  },
});
