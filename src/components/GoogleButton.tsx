import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useLinkingURL } from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createSessionFromUrl, signInWithGoogle } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { fonts, palette, radius, spacing } from '@/constants/theme';
import { AText } from '@/components/ui';

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <Path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </Svg>
  );
}

export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const incomingUrl = useLinkingURL();
  const handledRef = useRef<string | null>(null);

  // Android often delivers the OAuth callback as a deep link while the browser
  // sheet stays open — catch it here, finish the session, and dismiss the sheet.
  useEffect(() => {
    const hasAuth = incomingUrl && (incomingUrl.includes('access_token') || incomingUrl.includes('code='));
    if (!hasAuth || handledRef.current === incomingUrl) return;
    handledRef.current = incomingUrl;
    console.log('[oauth] deep link received, creating session');
    createSessionFromUrl(incomingUrl)
      .then((session) => {
        WebBrowser.dismissBrowser().catch(() => {});
        if (session) router.replace('/');
      })
      .catch(async (e) => {
        // Only surface an error if we're genuinely not signed in (avoids a
        // spurious alert when the other handler already completed the login).
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace('/');
          return;
        }
        console.error('[oauth] deep link session failed:', e?.message);
        Alert.alert('Google sign-in failed', e?.message ?? 'Please try again, or use email.');
      })
      .finally(() => setLoading(false));
  }, [incomingUrl]);

  return (
    <Pressable
      onPress={async () => {
        setLoading(true);
        try {
          const session = await signInWithGoogle();
          if (session) router.replace('/');
        } catch (e: any) {
          Alert.alert('Google sign-in failed', e?.message ?? 'Please try again, or use email.');
        } finally {
          setLoading(false);
        }
      }}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
      {loading ? <ActivityIndicator color={palette.textPrimary} /> : <GoogleIcon />}
      <AText style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: palette.textPrimary }}>
        Continue with Google
      </AText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.full,
    backgroundColor: palette.surfaceRaised,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
