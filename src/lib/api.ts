import { supabase } from './supabase';
import { dateKey, daysAgoKey, startOfTodayISO, todayKey } from './dates';
import type {
  ChatMessage,
  Habit,
  HabitLog,
  Insight,
  Meal,
  MealType,
  Memory,
  Profile,
  SleepLog,
  TimeOfDay,
  WaterLog,
} from './types';

const uid = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not signed in');
  return data.user.id;
};

// ---------- Profile ----------
export async function fetchProfile(): Promise<Profile | null> {
  console.log('[action] fetchProfile');
  const id = await uid();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  console.log('[action] updateProfile', Object.keys(patch).join(','));
  const id = await uid();
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ---------- Water ----------
export async function fetchTodayWater(): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .gte('logged_at', startOfTodayISO())
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return data as WaterLog[];
}

export async function fetchWaterHistory(days = 14): Promise<WaterLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data as WaterLog[];
}

export async function addWater(amountMl: number): Promise<WaterLog> {
  console.log('[action] addWater', amountMl);
  const user_id = await uid();
  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id, amount_ml: amountMl })
    .select()
    .single();
  if (error) throw error;
  return data as WaterLog;
}

export async function deleteWaterLog(id: string): Promise<void> {
  console.log('[action] deleteWaterLog');
  const { error } = await supabase.from('water_logs').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Sleep ----------
export async function fetchSleepLogs(days = 30): Promise<SleepLog[]> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .gte('date', daysAgoKey(days))
    .order('date', { ascending: true });
  if (error) throw error;
  return data as SleepLog[];
}

export async function upsertSleep(input: {
  date?: string;
  bedtime: Date;
  wakeTime: Date;
  quality?: number | null;
}): Promise<SleepLog> {
  console.log('[action] upsertSleep');
  const user_id = await uid();
  let { bedtime, wakeTime } = input;
  if (wakeTime <= bedtime) wakeTime = new Date(wakeTime.getTime() + 24 * 3600 * 1000);
  const duration_min = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
  const date = input.date ?? dateKey(wakeTime);
  const { data, error } = await supabase
    .from('sleep_logs')
    .upsert(
      {
        user_id,
        date,
        bedtime: bedtime.toISOString(),
        wake_time: wakeTime.toISOString(),
        duration_min,
        quality: input.quality ?? null,
      },
      { onConflict: 'user_id,date' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as SleepLog;
}

// ---------- Habits ----------
export async function fetchHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Habit[];
}

export async function fetchHabitLogs(days = 30): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('date', daysAgoKey(days));
  if (error) throw error;
  return data as HabitLog[];
}

export async function createHabit(input: {
  name: string;
  emoji?: string;
  time_of_day?: TimeOfDay;
  days_of_week?: number[];
}): Promise<Habit> {
  console.log('[action] createHabit', input.name);
  const user_id = await uid();
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id,
      name: input.name,
      emoji: input.emoji ?? '✨',
      time_of_day: input.time_of_day ?? 'anytime',
      days_of_week: input.days_of_week ?? [1, 2, 3, 4, 5, 6, 7],
    })
    .select()
    .single();
  if (error) throw error;
  return data as Habit;
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<Habit> {
  console.log('[action] updateHabit', Object.keys(patch).join(','));
  const { data, error } = await supabase
    .from('habits')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Habit;
}

export async function deleteHabit(id: string): Promise<void> {
  console.log('[action] deleteHabit');
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function setHabitLog(
  habitId: string,
  status: 'completed' | 'skipped',
  date = todayKey(),
): Promise<HabitLog> {
  console.log('[action] setHabitLog', status);
  const user_id = await uid();
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id: habitId, user_id, date, status }, { onConflict: 'habit_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data as HabitLog;
}

export async function clearHabitLog(habitId: string, date = todayKey()): Promise<void> {
  console.log('[action] clearHabitLog');
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('date', date);
  if (error) throw error;
}

// ---------- Meals ----------
export async function fetchTodayMeals(): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .gte('logged_at', startOfTodayISO())
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data as Meal[];
}

export async function fetchMealHistory(days = 14): Promise<Meal[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data as Meal[];
}

export async function addMeal(input: {
  meal_type: MealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): Promise<Meal> {
  console.log('[action] addMeal', input.meal_type);
  const user_id = await uid();
  const { data, error } = await supabase
    .from('meals')
    .insert({ user_id, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as Meal;
}

export async function deleteMeal(id: string): Promise<void> {
  console.log('[action] deleteMeal');
  const { error } = await supabase.from('meals').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Insights / memories / chat ----------
export async function fetchTodayInsight(): Promise<Insight | null> {
  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('date', todayKey())
    .maybeSingle();
  if (error) throw error;
  return data as Insight | null;
}

export async function fetchMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as Memory[];
}

export async function fetchChatHistory(limit = 30): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ChatMessage[]).reverse();
}
