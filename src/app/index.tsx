import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';
import { fetchProfile } from '@/lib/api';
import { useAurora } from '@/lib/store';
import { palette } from '@/constants/theme';

/** Routing gate: welcome → auth → setup → app, based on session + onboarding state. */
export default function Index() {
  const { session } = useSession();
  const setProfile = useAurora((s) => s.setProfile);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session) {
        setTarget('/welcome');
        return;
      }
      try {
        const profile = await fetchProfile();
        if (cancelled) return;
        setProfile(profile);
        setTarget(profile?.onboarding_complete ? '/(tabs)' : '/setup');
      } catch (e) {
        // Stale/invalid session — clear it and start over rather than letting
        // the user into the app unauthenticated.
        console.error('[gate] profile fetch failed, signing out:', (e as Error)?.message);
        await supabase.auth.signOut().catch(() => {});
        if (!cancelled) setTarget('/welcome');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, setProfile]);

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.auroraTeal} />
      </View>
    );
  }
  return <Redirect href={target as any} />;
}
