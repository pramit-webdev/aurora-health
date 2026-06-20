import { Text, type TextProps, type TextStyle } from 'react-native';
import { fonts, palette } from '@/constants/theme';

type Variant =
  | 'display' // big numbers / hero
  | 'title' // screen titles
  | 'heading' // card titles
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'label'; // small uppercase

const variantStyles: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.displayBold, fontSize: 34, color: palette.textPrimary, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 24, color: palette.textPrimary, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.heading, fontSize: 17, color: palette.textPrimary },
  body: { fontFamily: fonts.body, fontSize: 15, color: palette.textSecondary, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.textPrimary },
  caption: { fontFamily: fonts.body, fontSize: 13, color: palette.textTertiary },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: palette.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
};

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AText({ variant = 'body', color, style, ...rest }: Props) {
  return <Text {...rest} style={[variantStyles[variant], color ? { color } : null, style]} />;
}
