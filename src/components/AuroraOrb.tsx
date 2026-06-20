import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

interface Props {
  size: number;
  colors?: [string, string];
  /** 0..1 — how strongly it pulses; 0 = static */
  intensity?: number;
}

/**
 * The signature Aurora visual: a softly breathing gradient orb.
 * Used on the welcome carousel and as the voice companion's "face".
 */
export function AuroraOrb({ size, colors = ['#4FD1C5', '#818CF8'], intensity = 1 }: Props) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.85);

  useEffect(() => {
    if (intensity === 0) {
      scale.value = withTiming(1, { duration: 400 });
      glow.value = withTiming(0.85, { duration: 400 });
      return;
    }
    scale.value = withRepeat(
      withTiming(1 + 0.06 * intensity, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [intensity, scale, glow]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: glow.value,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.25 }],
    opacity: 0.5 * glow.value,
  }));

  const id0 = colors[0].replace('#', '');
  const id1 = colors[1].replace('#', '');

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, haloStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`halo-${id0}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors[1]} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={colors[1]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#halo-${id0})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ width: size * 0.62, height: size * 0.62 }, orbStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`orb-${id1}`} cx="38%" cy="32%" r="75%">
              <Stop offset="0%" stopColor="#EDFDFB" stopOpacity={0.95} />
              <Stop offset="35%" stopColor={colors[0]} stopOpacity={0.95} />
              <Stop offset="100%" stopColor={colors[1]} stopOpacity={0.9} />
            </RadialGradient>
          </Defs>
          <Circle cx={50} cy={50} r={50} fill={`url(#orb-${id1})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
