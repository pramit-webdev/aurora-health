import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { AuroraOrb } from '@/components/AuroraOrb';
import { AText } from '@/components/ui';
import { auroraGradient, fonts, palette, radius, spacing } from '@/constants/theme';
import { companionTurn, transcribeAudio, type AgentAction } from '@/lib/ai';
import { fetchChatHistory } from '@/lib/api';
import { useAurora } from '@/lib/store';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
}

const ORB_COLORS: Record<VoiceState, [string, string]> = {
  idle: ['#4FD1C5', '#818CF8'],
  listening: ['#38BDF8', '#4FD1C5'],
  thinking: ['#818CF8', '#A78BFA'],
  speaking: ['#A78BFA', '#F0ABFC'],
};

const STATE_LABEL: Record<VoiceState, string> = {
  idle: 'Tap the orb and start talking',
  listening: 'Listening… tap when done',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

const SUGGESTIONS = [
  'How am I doing this week?',
  'I drank 500ml of water',
  'I slept 7 hours last night',
  'Create a habit to meditate every morning',
];

const tmpAudioPath = () => `${FileSystem.cacheDirectory}aurora-reply-${Date.now()}.mp3`;

// Custom recording config. The Android 'voice_recognition' source engages the
// mic far more reliably for speech than the default 'mic' source (which gets
// contended/muted by Android's audio policy → the intermittent silent capture).
// Mono 16kHz is what Whisper wants and is the most universally supported config.
const REC_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    audioSource: 'voice_recognition' as const,
  },
};

/** Expanding sonar ring radiating from the orb while Aurora listens. */
function SonarRing({ delay }: { delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.72 + progress.value * 0.65 }],
    opacity: 0.6 * (1 - progress.value),
  }));
  return <Animated.View pointerEvents="none" style={[styles.sonar, style]} />;
}

const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Companion() {
  const insets = useSafeAreaInsets();
  const refreshToday = useAurora((s) => s.refreshToday);
  const profile = useAurora((s) => s.profile);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  const recorder = useAudioRecorder(REC_OPTIONS);
  const player = useAudioPlayer();
  const scrollRef = useRef<ScrollView>(null);
  const busyRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);

  // Recording timer while listening (reset happens in startListening)
  useEffect(() => {
    if (voiceState !== 'listening') return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [voiceState]);

  useEffect(() => {
    fetchChatHistory(12)
      .then((msgs) => setTurns(msgs.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => {});
  }, []);

  // When TTS playback finishes, return to idle
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) setVoiceState((s) => (s === 'speaking' ? 'idle' : s));
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [turns.length, voiceState]);

  const startListening = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Aurora needs the mic to hear you. You can also type instead.');
      return;
    }
    try {
      player.pause(); // free the session from any prior TTS playback
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setElapsed(0);
      setVoiceState('listening');
    } catch (e) {
      console.error('[companion] start recording failed:', (e as Error)?.message);
      setVoiceState('idle');
      Alert.alert('Mic trouble', 'Could not start recording. Please try again, or type instead.');
    }
  };

  const stopAndProcess = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setVoiceState('thinking');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording captured');

      const transcript = (await transcribeAudio(uri)).trim();
      if (!transcript) {
        setVoiceState('idle');
        Alert.alert("Didn't catch that", 'Try speaking a little longer, or type your message.');
        return;
      }
      await runTurn(transcript);
    } catch (e: any) {
      console.error('[companion] record/transcribe failed:', e?.message, JSON.stringify(e));
      setVoiceState('idle');
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
    } finally {
      busyRef.current = false;
    }
  };

  const runTurn = async (message: string) => {
    setTurns((t) => [...t, { role: 'user', content: message }]);
    setVoiceState('thinking');
    try {
      const res = await companionTurn(message, { voice: true });
      setTurns((t) => [...t, { role: 'assistant', content: res.reply, actions: res.actions }]);
      refreshToday().catch(() => {});
      if (res.actions.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (res.audioB64) {
        const path = tmpAudioPath();
        await FileSystem.writeAsStringAsync(path, res.audioB64, { encoding: FileSystem.EncodingType.Base64 });
        player.replace({ uri: path });
        player.play();
        setVoiceState('speaking');
      } else {
        setVoiceState('idle');
      }
    } catch (e: any) {
      console.error('[companion] turn failed:', e?.message, JSON.stringify(e));
      setVoiceState('idle');
      Alert.alert('Aurora had trouble responding', e?.message ?? 'Please try again.');
    }
  };

  const onOrbPress = () => {
    if (voiceState === 'idle') startListening();
    else if (voiceState === 'listening') stopAndProcess();
    else if (voiceState === 'speaking') {
      player.pause();
      setVoiceState('idle');
    }
  };

  const sendText = async () => {
    const msg = textInput.trim();
    if (!msg || voiceState === 'thinking') return;
    setTextInput('');
    Keyboard.dismiss();
    await runTurn(msg);
  };

  const firstName = profile?.name?.split(' ')[0];

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <LinearGradient
        colors={['rgba(129,140,248,0.18)', 'rgba(79,209,197,0.06)', 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={24} color={palette.textPrimary} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AText variant="heading">Aurora</AText>
          <AText variant="caption" style={{ fontSize: 11 }}>
            your health companion
          </AText>
        </View>
        <Pressable
          onPress={() => setShowKeyboard((v) => !v)}
          hitSlop={12}
          style={[styles.headerBtn, showKeyboard && { backgroundColor: 'rgba(79,209,197,0.15)' }]}>
          <Ionicons name="keypad-outline" size={18} color={showKeyboard ? palette.auroraTeal : palette.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chat}
        showsVerticalScrollIndicator={false}>
        {turns.length === 0 && (
          <Animated.View entering={FadeInDown.duration(600)} style={{ gap: spacing.md, marginTop: spacing.xl }}>
            <AText variant="title" style={{ textAlign: 'center', fontSize: 20 }}>
              {firstName ? `Hey ${firstName} 👋` : 'Hey there 👋'}
            </AText>
            <AText variant="body" style={{ textAlign: 'center' }}>
              Talk to me about your day — I can log water, sleep and meals, manage habits, and tell you how you’re doing.
            </AText>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => runTurn(s)} style={styles.suggestion}>
                  <AText variant="caption" style={{ color: palette.textSecondary }}>
                    “{s}”
                  </AText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
        {turns.map((t, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.duration(300)}
            style={[styles.bubble, t.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <AText
              variant="body"
              style={{ color: t.role === 'user' ? palette.textOnAccent : palette.textPrimary, lineHeight: 21 }}>
              {t.content}
            </AText>
            {t.actions?.length ? (
              <View style={styles.actions}>
                {t.actions.map((a, j) => (
                  <View key={j} style={styles.actionChip}>
                    <Ionicons name="checkmark-circle" size={13} color={palette.success} />
                    <AText variant="caption" style={{ color: palette.success, fontSize: 12 }}>
                      {a.summary}
                    </AText>
                  </View>
                ))}
              </View>
            ) : null}
          </Animated.View>
        ))}
        {voiceState === 'thinking' && (
          <Animated.View entering={FadeInUp.duration(300)} style={[styles.bubble, styles.aiBubble]}>
            <AText variant="body" style={{ color: palette.textTertiary }}>
              Aurora is thinking…
            </AText>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        {showKeyboard ? (
          <View style={styles.inputRow}>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Type to Aurora…"
              placeholderTextColor={palette.textTertiary}
              style={styles.input}
              onSubmitEditing={sendText}
              returnKeyType="send"
              autoFocus
            />
            <Pressable onPress={sendText} style={styles.sendBtn}>
              <LinearGradient colors={[...auroraGradient]} style={styles.sendGradient}>
                <Ionicons name="arrow-up" size={20} color={palette.textOnAccent} />
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <Pressable onPress={onOrbPress} disabled={voiceState === 'thinking'} style={styles.orbWrap}>
              {voiceState === 'listening' && (
                <>
                  <SonarRing delay={0} />
                  <SonarRing delay={650} />
                  <SonarRing delay={1300} />
                </>
              )}
              <AuroraOrb
                size={170}
                colors={ORB_COLORS[voiceState]}
                intensity={voiceState === 'listening' ? 1.6 : voiceState === 'speaking' ? 1.3 : voiceState === 'thinking' ? 0.6 : 0.8}
              />
            </Pressable>
            <AText
              variant="caption"
              style={{ color: voiceState === 'idle' ? palette.textTertiary : palette.auroraTeal }}>
              {voiceState === 'listening'
                ? `● ${formatElapsed(elapsed)} — listening, tap when done`
                : STATE_LABEL[voiceState]}
            </AText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  chat: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, padding: spacing.lg },
  userBubble: { alignSelf: 'flex-end', backgroundColor: palette.auroraTeal, borderBottomRightRadius: 6 },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderBottomLeftRadius: 6,
  },
  actions: { marginTop: spacing.sm, gap: 4 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  suggestions: { gap: spacing.sm, marginTop: spacing.md },
  suggestion: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignSelf: 'center',
  },
  bottom: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.textPrimary,
  },
  sendBtn: { borderRadius: 999 },
  sendGradient: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  orbWrap: { alignItems: 'center', justifyContent: 'center' },
  sonar: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: palette.auroraTeal,
  },
});
