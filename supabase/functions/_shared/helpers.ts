// Shared helpers for Aurora edge functions (Deno runtime)
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const handleOptions = (req: Request) =>
  req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;

/** Client bound to the caller's JWT — all queries run under RLS as that user. */
export async function getAuthedClient(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return { supabase, user };
}

/** 'YYYY-MM-DD' in the user's local timezone (tzOffsetMin = minutes east of UTC). */
export function localDateKey(tzOffsetMin: number, d = new Date()): string {
  const local = new Date(d.getTime() + tzOffsetMin * 60000);
  return local.toISOString().slice(0, 10);
}

export function localDayStartISO(tzOffsetMin: number): string {
  const local = new Date(Date.now() + tzOffsetMin * 60000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - tzOffsetMin * 60000).toISOString();
}

export interface UserContext {
  profile: Record<string, unknown> | null;
  todayWaterMl: number;
  waterGoalMl: number;
  sleep: { date: string; duration_min: number; bedtime: string }[];
  habits: { id: string; name: string; emoji: string; status: string; time_of_day: string }[];
  todayHabitLogs: { habit_id: string; status: string }[];
  todayMeals: { meal_type: string; description: string; calories: number }[];
  memories: { content: string; category: string }[];
}

export async function gatherContext(
  supabase: SupabaseClient,
  tzOffsetMin: number,
): Promise<UserContext> {
  const dayStart = localDayStartISO(tzOffsetMin);
  const today = localDateKey(tzOffsetMin);
  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const [profileQ, waterQ, sleepQ, habitsQ, habitLogsQ, mealsQ, memoriesQ] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    supabase.from('water_logs').select('amount_ml').gte('logged_at', dayStart),
    supabase.from('sleep_logs').select('date,duration_min,bedtime').gte('date', since).order('date'),
    supabase.from('habits').select('id,name,emoji,status,time_of_day'),
    supabase.from('habit_logs').select('habit_id,status').eq('date', today),
    supabase.from('meals').select('meal_type,description,calories').gte('logged_at', dayStart),
    supabase.from('memories').select('content,category').order('created_at', { ascending: false }).limit(12),
  ]);

  const profile = profileQ.data ?? null;
  return {
    profile,
    todayWaterMl: (waterQ.data ?? []).reduce((s: number, r: { amount_ml: number }) => s + r.amount_ml, 0),
    waterGoalMl: (profile?.water_goal_ml as number) ?? 2500,
    sleep: sleepQ.data ?? [],
    habits: habitsQ.data ?? [],
    todayHabitLogs: habitLogsQ.data ?? [],
    todayMeals: mealsQ.data ?? [],
    memories: memoriesQ.data ?? [],
  };
}

export function contextSummary(ctx: UserContext, today: string): string {
  const p = ctx.profile ?? {};
  const fmtMin = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
  const lastNight = ctx.sleep.find((s) => s.date === today);
  const week = ctx.sleep.slice(-7);
  const avg = week.length ? Math.round(week.reduce((s, l) => s + l.duration_min, 0) / week.length) : null;
  const completed = new Set(ctx.todayHabitLogs.filter((l) => l.status === 'completed').map((l) => l.habit_id));

  return [
    `USER: ${p.name ?? 'Unknown'}, age ${p.age ?? '?'}, goals: ${(p.goals as string[])?.join(', ') || 'none set'}. Usual wake ${p.wake_time ?? '?'}, bed ${p.bed_time ?? '?'}, activity ${p.activity_level ?? '?'}.`,
    `TODAY (${today}):`,
    `- Water: ${ctx.todayWaterMl}ml of ${ctx.waterGoalMl}ml goal (${Math.round((ctx.todayWaterMl / ctx.waterGoalMl) * 100)}%)`,
    `- Sleep last night: ${lastNight ? fmtMin(lastNight.duration_min) : 'not logged'}${avg ? `; 7-day avg ${fmtMin(avg)}` : ''}`,
    `- Habits: ${ctx.habits.filter((h) => h.status === 'active').map((h) => `${h.name}${completed.has(h.id) ? ' ✓done' : ''}`).join(', ') || 'none yet'}`,
    `- Meals today: ${ctx.todayMeals.map((m) => `${m.meal_type}: ${m.description} (${m.calories}kcal)`).join('; ') || 'none logged'}`,
    ctx.memories.length
      ? `THINGS AURORA REMEMBERS:\n${ctx.memories.map((m) => `- ${m.content}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------- OpenAI helpers ----------
export async function openaiChat(body: Record<string, unknown>) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export async function openaiTTS(text: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
      speed: 1.05,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`TTS error ${res.status}: ${t.slice(0, 300)}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  // chunked base64 encode (avoids call-stack limits on large buffers)
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}
