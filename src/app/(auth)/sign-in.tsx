import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { AText, Button, Input, Screen } from '@/components/ui';
import { GoogleButton } from '@/components/GoogleButton';
import { palette, spacing } from '@/constants/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Almost there', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace('/');
    } catch (e: any) {
      console.error('[auth] sign-in failed:', e?.message, JSON.stringify(e));
      Alert.alert('Sign in failed', e?.message ?? 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padBottom={spacing.xl}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
          <View style={{ gap: spacing.sm, marginTop: spacing.xxxl }}>
            <AText variant="display">Welcome{'\n'}back</AText>
            <AText variant="body">Pick up right where you left off.</AText>
          </View>

          <View style={{ gap: spacing.lg }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <Button title="Sign in" onPress={handleSignIn} loading={loading} />
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <AText variant="caption">or</AText>
              <View style={styles.divider} />
            </View>
            <GoogleButton />
            <Button
              title="New here? Create an account"
              variant="ghost"
              onPress={() => router.replace('/(auth)/sign-up')}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: spacing.xl, gap: spacing.xxl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: palette.border },
});
