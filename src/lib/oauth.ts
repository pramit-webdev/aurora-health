import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri();

// The browser-result handler and the deep-link listener can both fire for the
// same callback. A PKCE code is single-use, so guard against a double exchange
// (which otherwise throws a spurious "sign-in failed" after a successful login).
const handledCodes = new Set<string>();

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  if (params.error) throw new Error(params.error_description || params.error);

  // PKCE flow (supabase-js v2 default): Google returns a one-time ?code= that
  // we exchange for a session using the verifier stored at sign-in time.
  if (params.code) {
    // Already handled by the other path — just return the live session.
    if (handledCodes.has(params.code)) {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
    handledCodes.add(params.code);
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      // Lost a race but the session may already exist — don't surface an error.
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) return existing.session;
      throw error;
    }
    return data.session;
  }

  // Implicit flow fallback: tokens arrive in the URL fragment.
  const { access_token, refresh_token } = params;
  if (!access_token) return null;
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
}

/** Full mobile OAuth round-trip via the system browser. */
export async function signInWithGoogle() {
  console.log('[oauth] redirectTo =', redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo);
  console.log(
    '[oauth] browser result:', result.type,
    'hasFragment:', 'url' in result ? String(result.url.includes('#')) : 'n/a',
  );
  if (result.type === 'success') {
    return createSessionFromUrl(result.url);
  }
  // The deep link sometimes lands the session even when the sheet reports
  // dismiss/cancel — check before giving up.
  await new Promise((r) => setTimeout(r, 1200));
  const { data: sessionData } = await supabase.auth.getSession();
  console.log('[oauth] post-browser session check:', sessionData.session ? 'SESSION EXISTS' : 'no session');
  return sessionData.session;
}
