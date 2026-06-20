#!/usr/bin/env node
/**
 * Seed realistic backdated history for a demo account so Trends/Streaks/
 * Achievements look lived-in on camera. TODAY is left empty so the voice
 * agent can fill it in live during the recording.
 *
 *   node scripts/seed-demo.js <email> [numDays=7] [tzOffsetMin=330]
 *
 * Requires /tmp/sb-service.key (service_role key). Idempotent-ish: it clears
 * the account's existing logs first so re-running won't pile up duplicates.
 */
const fs = require('fs');
const path = require('path');

const EMAIL = process.argv[2];
const NUM_DAYS = parseInt(process.argv[3] ?? '7', 10);
const TZ = parseInt(process.argv[4] ?? '330', 10); // IST default

if (!EMAIL) {
  console.error('Usage: node scripts/seed-demo.js <email> [numDays] [tzOffsetMin]');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
const URL_ = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const SVC = fs.readFileSync('/tmp/sb-service.key', 'utf8').trim();

const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' };

// ---- local-time helpers (account is in TZ minutes east of UTC) ----
const baseLocal = (d) => {
  const b = new Date(Date.now() + TZ * 60000);
  b.setUTCDate(b.getUTCDate() - d);
  return b;
};
const localDateKey = (d) => baseLocal(d).toISOString().slice(0, 10);
const localInstant = (d, hour, minute) => {
  const b = baseLocal(d);
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), hour, minute) - TZ * 60000);
};
const jitter = (n) => Math.floor((Math.random() - 0.5) * 2 * n);
const parseHM = (hm, fb) => {
  if (!hm) return fb;
  const [h, m] = hm.split(':').map(Number);
  return Number.isNaN(h) ? fb : [h, m];
};

const rest = async (table, rows) => {
  const res = await fetch(`${URL_}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${(await res.text()).slice(0, 160)}`);
};
const del = async (table, userId) => {
  await fetch(`${URL_}/rest/v1/${table}?user_id=eq.${userId}`, { method: 'DELETE', headers: H });
};

const BREAKFASTS = [
  ['Oatmeal with banana and honey', 320, 8, 58, 6],
  ['2 eggs, toast and orange juice', 400, 18, 38, 18],
  ['Greek yogurt with berries and granola', 300, 17, 40, 8],
  ['Poha with peanuts and a chai', 350, 9, 55, 10],
];
const LUNCHES = [
  ['Dal, rice, salad and a bowl of curd', 600, 22, 95, 12],
  ['Grilled chicken wrap with veggies', 520, 38, 45, 18],
  ['Rajma chawal with a side salad', 580, 20, 92, 11],
  ['Paneer bowl with quinoa', 560, 26, 60, 22],
];
const DINNERS = [
  ['2 rotis, mixed vegetable curry and dal', 520, 19, 70, 14],
  ['Grilled fish with rice and broccoli', 540, 40, 48, 16],
  ['Vegetable khichdi with curd', 430, 15, 68, 9],
  ['Tofu stir-fry with noodles', 500, 24, 62, 16],
];

(async () => {
  // 1. Look up user + profile
  const { users = [] } = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const user = users.find((u) => u.email === EMAIL);
  if (!user) {
    console.error(`❌ ${EMAIL} not found. Sign in with that account first.`);
    process.exit(1);
  }
  const profiles = await (await fetch(`${URL_}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers: H })).json();
  const profile = profiles[0];
  if (!profile) {
    console.error('❌ No profile row — let the signup trigger run first.');
    process.exit(1);
  }
  const goalMl = profile.water_goal_ml || 2500;
  const sleepGoal = profile.sleep_goal_min || 480;
  const [wakeH, wakeM] = parseHM(profile.wake_time, [7, 0]);
  console.log(`Seeding ${NUM_DAYS} days for ${EMAIL} (goal ${goalMl}ml, sleep ${sleepGoal}min)…`);

  // 2. Clear existing logs (keep profile) so re-runs don't duplicate.
  //    'insights' is cleared too so the dashboard regenerates a rich, data-driven
  //    insight on next refresh (instead of the generic empty-account one).
  for (const t of ['water_logs', 'sleep_logs', 'habit_logs', 'meals', 'habits', 'insights']) await del(t, user.id);

  // 3. Habits (created 1 day before the window so they predate all logs)
  const habitDefs = [
    { name: 'Meditate', emoji: '🧘', time_of_day: 'morning' },
    { name: 'Read 10 pages', emoji: '📖', time_of_day: 'evening' },
    { name: 'Walk 20 minutes', emoji: '🚶', time_of_day: 'anytime' },
  ];
  const habitRows = habitDefs.map((h) => ({
    user_id: user.id,
    ...h,
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    status: 'active',
    created_at: localInstant(NUM_DAYS + 1, 9, 0).toISOString(),
  }));
  await fetch(`${URL_}/rest/v1/habits`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(habitRows),
  })
    .then((r) => r.json())
    .then((created) => (habitDefs.forEach((h, i) => (h.id = created[i].id))));

  const water = [];
  const sleep = [];
  const habitLogs = [];
  const meals = [];

  // 4. Per-day backdated data (day 1 = yesterday … day NUM_DAYS)
  for (let d = 1; d <= NUM_DAYS; d++) {
    const dateKey = localDateKey(d);

    // Water — 4 logs that comfortably clear the goal every day (varied heights
    // for natural-looking charts) so the hydration streak stays alive at 7.
    const target = goalMl + 150 + Math.floor(Math.random() * 450);
    const splits = [0.28, 0.26, 0.24, 0.22];
    [9, 12, 16, 20].forEach((hr, i) => {
      water.push({
        user_id: user.id,
        amount_ml: Math.max(100, Math.round((target * splits[i]) / 50) * 50),
        logged_at: localInstant(d, hr, jitter(20) + 30).toISOString(),
      });
    });

    // Sleep — comfortably above the streak threshold every night (7.5–8.2h)
    const duration = Math.round(sleepGoal * 0.95) + Math.floor(Math.random() * 40);
    const wake = localInstant(d, wakeH, wakeM + jitter(25));
    const bedtime = new Date(wake.getTime() - duration * 60000);
    sleep.push({
      user_id: user.id,
      date: dateKey,
      bedtime: bedtime.toISOString(),
      wake_time: wake.toISOString(),
      duration_min: duration,
      quality: 3 + (d % 3),
    });

    // Habits — complete all three (keeps the all-habits-done streak alive)
    habitDefs.forEach((h) => habitLogs.push({ habit_id: h.id, user_id: user.id, date: dateKey, status: 'completed' }));

    // Meals — breakfast, lunch, dinner
    const pick = (arr) => arr[(d + arr.length) % arr.length];
    [['breakfast', pick(BREAKFASTS), 8], ['lunch', pick(LUNCHES), 13], ['dinner', pick(DINNERS), 20]].forEach(
      ([type, [desc, cal, p, c, f], hr]) => {
        meals.push({
          user_id: user.id,
          meal_type: type,
          description: desc,
          calories: cal,
          protein_g: p,
          carbs_g: c,
          fat_g: f,
          logged_at: localInstant(d, hr, jitter(20) + 15).toISOString(),
        });
      },
    );
  }

  await rest('water_logs', water);
  await rest('sleep_logs', sleep);
  await rest('habit_logs', habitLogs);
  await rest('meals', meals);

  console.log(`✅ Seeded: ${water.length} water · ${sleep.length} sleep · ${habitDefs.length} habits · ${habitLogs.length} habit-logs · ${meals.length} meals`);
  console.log('   Today left empty for the live voice demo. Pull-to-refresh the app to see it all.');
})();
