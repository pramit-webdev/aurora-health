#!/usr/bin/env node
/**
 * Aurora backend smoke test — run before every build/demo:
 *   node scripts/smoke-test.js
 *
 * Verifies in ~30s: auth, database + RLS, all AI edge functions
 * (agent actions, no-duplicate regression, meal parsing, insight, TTS audio).
 * Uses the dedicated test account; never touches real user data.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
const URL_ = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const ANON = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const TEST_EMAIL = 'aurora.test@example.com';
const TEST_PASSWORD = 'test12345';

const results = [];
let jwt = null;

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
    console.log(`❌ ${name} — ${e.message}`);
  }
}

const api = async (pathname, opts = {}) => {
  const res = await fetch(`${URL_}${pathname}`, {
    ...opts,
    headers: {
      apikey: ANON,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body).slice(0, 150)}`);
  return body;
};

const tz = -new Date().getTimezoneOffset();
const chat = (message) =>
  api('/functions/v1/ai-chat', {
    method: 'POST',
    body: JSON.stringify({ message, voice: false, tzOffsetMin: tz }),
  });

(async () => {
  console.log(`\nAurora smoke test → ${URL_}\n`);

  await step('Auth: sign in test user', async () => {
    let res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    if (!res.ok) {
      // Auto-recreate the test account if it was purged
      res = await fetch(`${URL_}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, data: { name: 'Test User' } }),
      });
    }
    const data = await res.json();
    if (!data.access_token) throw new Error('no session returned');
    jwt = data.access_token;
    return 'session ok';
  });

  await step('DB: profile row exists (RLS)', async () => {
    const rows = await api('/rest/v1/profiles?select=id,name');
    if (!rows.length) throw new Error('no profile row');
    return rows[0].name || 'unnamed';
  });

  await step('AI: parse-meal estimates macros', async () => {
    const meal = await api('/functions/v1/parse-meal', {
      method: 'POST',
      body: JSON.stringify({ description: '2 eggs and toast' }),
    });
    if (!meal.calories || meal.calories < 50) throw new Error(`implausible calories: ${meal.calories}`);
    return `${meal.calories} kcal`;
  });

  let waterBefore = 0;
  await step('AI: agent logs water via tool call', async () => {
    const rows = await api('/rest/v1/water_logs?select=amount_ml');
    waterBefore = rows.length;
    const r = await chat('I drank 250ml of water');
    if (!r.actions?.some((a) => a.tool === 'log_water')) throw new Error(`no log_water action: ${JSON.stringify(r.actions)}`);
    const after = await api('/rest/v1/water_logs?select=amount_ml');
    if (after.length !== waterBefore + 1) throw new Error('row not written');
    return r.actions.map((a) => a.summary).join('; ');
  });

  await step('AI: follow-up question does NOT re-log (regression)', async () => {
    const r = await chat('Thanks! How am I doing today?');
    if (r.actions?.length) throw new Error(`unexpected actions: ${JSON.stringify(r.actions)}`);
    const after = await api('/rest/v1/water_logs?select=amount_ml');
    if (after.length !== waterBefore + 1) throw new Error('duplicate row written');
    return 'no duplicate actions';
  });

  await step('AI: daily insight generates', async () => {
    const r = await api('/functions/v1/daily-insight', {
      method: 'POST',
      body: JSON.stringify({ tzOffsetMin: tz }),
    });
    if (!r.insight?.content) throw new Error('no insight content');
    return `"${r.insight.content.slice(0, 50)}…"`;
  });

  await step('AI: voice reply returns TTS audio', async () => {
    const r = await api('/functions/v1/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Say hi in five words', voice: true, tzOffsetMin: tz }),
    });
    if (!r.audioB64 || r.audioB64.length < 5000) throw new Error('no/short audio returned');
    return `${Math.round((r.audioB64.length * 3) / 4 / 1024)}KB mp3`;
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? '🎉 ALL SYSTEMS GO' : `🚨 ${failed.length} FAILURE(S)`} — ${results.length - failed.length}/${results.length} passed\n`);
  process.exit(failed.length ? 1 : 0);
})();
