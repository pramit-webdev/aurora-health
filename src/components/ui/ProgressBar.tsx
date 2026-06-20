import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '@/constants/theme';

interface Props {
  /** 0..1 */
  progress: number;
  color: string;
  colorEnd?: string;
  height?: number;
}

export function ProgressBar({ progress, color, colorEnd, height = 8 }: Props) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(progress, 0), 1) * 100, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[{ height, borderRadius: height / 2, overflow: 'hidden' }, fillStyle]}>
        <LinearGradient
          colors={[color, colorEnd ?? color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(148,163,184,0.14)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
});
