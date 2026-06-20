import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { AText, Button, Input, Screen } from '@/components/ui';
import { GoogleButton } from '@/components/GoogleButton';
import { palette, spacing } from '@/constants/theme';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Almost there', 'Please fill in your name, email, and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) throw error;
      if (data.session) {
        router.replace('/');
      } else {
        Alert.alert('Confirm your email', 'We sent you a confirmation link. Tap it, then sign in.');
        router.replace('/(auth)/sign-in');
      }
    } catch (e: any) {
      console.error('[auth] sign-up failed:', e?.message, JSON.stringify(e));
      Alert.alert('Sign up failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padBottom={spacing.xl}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
          <View style={{ gap: spacing.sm, marginTop: spacing.xxxl }}>
            <AText variant="display">Create your{'\n'}account</AText>
            <AText variant="body">Aurora keeps your health data private and secure.</AText>
          </View>

          <View style={{ gap: spacing.lg }}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
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
              placeholder="At least 6 characters"
              secureTextEntry
            />
          </View>

          <View style={{ gap: spacing.md }}>
            <Button title="Create account" onPress={handleSignUp} loading={loading} />
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <AText variant="caption">or</AText>
              <View style={styles.divider} />
            </View>
            <GoogleButton />
            <Button
              title="Already have an account? Sign in"
              variant="ghost"
              onPress={() => router.replace('/(auth)/sign-in')}
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
