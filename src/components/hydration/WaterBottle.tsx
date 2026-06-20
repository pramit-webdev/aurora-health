import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/constants/theme';
import { AText } from '@/components/ui';
import { formatMl } from '@/lib/dates';

const WAVE_WIDTH = 360;

function Wave({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={WAVE_WIDTH * 2} height={22} viewBox={`0 0 ${WAVE_WIDTH * 2} 22`}>
      <Path
        d={`M0 12 Q ${WAVE_WIDTH / 4} 0 ${WAVE_WIDTH / 2} 12 T ${WAVE_WIDTH} 12 T ${WAVE_WIDTH * 1.5} 12 T ${WAVE_WIDTH * 2} 12 V 22 H 0 Z`}
        fill={color}
        opacity={opacity}
      />
    </Svg>
  );
}

interface Props {
  /** 0..1 */
  progress: number;
  currentMl: number;
  goalMl: number;
  width?: number;
  height?: number;
}

/** The virtual water bottle: glass vessel whose water level rises with a living wave surface. */
export function WaterBottle({ progress, currentMl, goalMl, width = 190, height = 300 }: Props) {
  const fill = useSharedValue(0);
  const wavePhase = useSharedValue(0);
  const clamped = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    fill.value = withTiming(clamped, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [clamped, fill]);

  useEffect(() => {
    wavePhase.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
  }, [wavePhase]);

  const innerHeight = height - 16;

  const fillStyle = useAnimatedStyle(() => ({
    height: 22 + fill.value * (innerHeight - 26),
  }));

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -WAVE_WIDTH * wavePhase.value }],
  }));
  const waveStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateX: -WAVE_WIDTH * ((wavePhase.value + 0.45) % 1) }],
  }));

  return (
    <View style={{ alignItems: 'center', gap: 14 }}>
      <View style={[styles.bottle, { width, height }]}>
        {/* neck */}
        <View style={styles.neck} />
        <View style={[styles.vessel, { width, height }]}>
          <Animated.View style={[styles.fill, fillStyle]}>
            {/* wave surface (two layers, phase-shifted) */}
            <View style={styles.waveRow}>
              <Animated.View style={[styles.wave, waveStyle]}>
                <Wave color={palette.hydration} opacity={0.55} />
              </Animated.View>
              <Animated.View style={[styles.wave, waveStyle2]}>
                <Wave color={palette.hydrationDeep} opacity={0.9} />
              </Animated.View>
            </View>
            {/* body of the water */}
            <LinearGradient
              colors={[palette.hydrationDeep, 'rgba(14,165,233,0.75)', 'rgba(56,189,248,0.55)']}
              style={styles.water}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </Animated.View>
          {/* glass highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gloss}
            pointerEvents="none"
          />
          {/* center readout */}
          <View style={styles.readout} pointerEvents="none">
            <AText variant="display" style={{ fontSize: 32 }}>
              {formatMl(currentMl)}
            </AText>
            <AText variant="caption">of {formatMl(goalMl)} goal</AText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottle: { alignItems: 'center' },
  neck: {
    position: 'absolute',
    top: -14,
    width: 64,
    height: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(148,163,184,0.35)',
    zIndex: 2,
  },
  vessel: {
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(56,189,248,0.05)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  fill: { borderBottomLeftRadius: 38, borderBottomRightRadius: 38, overflow: 'hidden' },
  waveRow: { height: 22, overflow: 'hidden' },
  wave: { position: 'absolute', left: 0, top: 0 },
  water: { flex: 1, marginTop: -1 },
  gloss: {
    position: 'absolute',
    top: 18,
    left: 14,
    width: 26,
    height: '55%',
    borderRadius: 13,
  },
  readout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
