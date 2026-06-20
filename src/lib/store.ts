import { create } from 'zustand';
import * as api from './api';
import { dateKey, daysAgoKey, isoWeekday, todayKey } from './dates';
import type {
  Habit,
  HabitLog,
  Insight,
  Meal,
  Memory,
  Profile,
  SleepLog,
  TodayStats,
  WaterLog,
} from './types';

interface AuroraState {
  loaded: boolean;
  profile: Profile | null;
  todayWater: WaterLog[];
  waterHistory: WaterLog[];
  sleepLogs: SleepLog[];
  habits: Habit[];
  habitLogs: HabitLog[];
  todayMeals: Meal[];
  mealHistory: Meal[];
  insight: Insight | null;
  memories: Memory[];

  loadAll: () => Promise<void>;
  refreshToday: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  reset: () => void;

  addWater: (ml: number) => Promise<void>;
  removeWaterLog: (id: string) => Promise<void>;
  logSleep: (input: { bedtime: Date; wakeTime: Date; quality?: number | null; date?: string }) => Promise<void>;
  createHabit: (input: Parameters<typeof api.createHabit>[0]) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  setHabitStatus: (habitId: string, status: 'completed' | 'skipped') => Promise<void>;
  clearHabitStatus: (habitId: string) => Promise<void>;
  addMeal: (input: Parameters<typeof api.addMeal>[0]) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  setInsight: (i: Insight | null) => void;
}

const empty = {
  loaded: false,
  profile: null,
  todayWater: [],
  waterHistory: [],
  sleepLogs: [],
  habits: [],
  habitLogs: [],
  todayMeals: [],
  mealHistory: [],
  insight: null,
  memories: [],
};

export const useAurora = create<AuroraState>((set, get) => ({
  ...empty,

  loadAll: async () => {
    const [profile, todayWater, waterHistory, sleepLogs, habits, habitLogs, todayMeals, mealHistory, insight, memories] =
      await Promise.all([
        api.fetchProfile(),
        api.fetchTodayWater(),
        api.fetchWaterHistory(14),
        api.fetchSleepLogs(30),
        api.fetchHabits(),
        api.fetchHabitLogs(30),
        api.fetchTodayMeals(),
        api.fetchMealHistory(14),
        api.fetchTodayInsight(),
        api.fetchMemories(),
      ]);
    set({
      loaded: true,
      profile,
      todayWater,
      waterHistory,
      sleepLogs,
      habits,
      habitLogs,
      todayMeals,
      mealHistory,
      insight,
      memories,
    });
  },

  // Lighter refresh used after voice-agent turns (agent may have written anything)
  refreshToday: async () => {
    const [todayWater, sleepLogs, habits, habitLogs, todayMeals, insight, memories] = await Promise.all([
      api.fetchTodayWater(),
      api.fetchSleepLogs(30),
      api.fetchHabits(),
      api.fetchHabitLogs(30),
      api.fetchTodayMeals(),
      api.fetchTodayInsight(),
      api.fetchMemories(),
    ]);
    set({ todayWater, sleepLogs, habits, habitLogs, todayMeals, insight, memories });
  },

  setProfile: (profile) => set({ profile }),
  setInsight: (insight) => set({ insight }),
  reset: () => set({ ...empty }),

  addWater: async (ml) => {
    const log = await api.addWater(ml);
    set((s) => ({ todayWater: [log, ...s.todayWater], waterHistory: [...s.waterHistory, log] }));
  },

  removeWaterLog: async (id) => {
    await api.deleteWaterLog(id);
    set((s) => ({
      todayWater: s.todayWater.filter((w) => w.id !== id),
      waterHistory: s.waterHistory.filter((w) => w.id !== id),
    }));
  },

  logSleep: async (input) => {
    const log = await api.upsertSleep({ bedtime: input.bedtime, wakeTime: input.wakeTime, quality: input.quality, date: input.date });
    set((s) => ({
      sleepLogs: [...s.sleepLogs.filter((l) => l.date !== log.date), log].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }));
  },

  createHabit: async (input) => {
    const habit = await api.createHabit(input);
    set((s) => ({ habits: [...s.habits, habit] }));
  },

  updateHabit: async (id, patch) => {
    const habit = await api.updateHabit(id, patch);
    set((s) => ({ habits: s.habits.map((h) => (h.id === id ? habit : h)) }));
  },

  deleteHabit: async (id) => {
    await api.deleteHabit(id);
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      habitLogs: s.habitLogs.filter((l) => l.habit_id !== id),
    }));
  },

  setHabitStatus: async (habitId, status) => {
    const log = await api.setHabitLog(habitId, status);
    set((s) => ({
      habitLogs: [...s.habitLogs.filter((l) => !(l.habit_id === habitId && l.date === log.date)), log],
    }));
  },

  clearHabitStatus: async (habitId) => {
    const today = todayKey();
    await api.clearHabitLog(habitId);
    set((s) => ({
      habitLogs: s.habitLogs.filter((l) => !(l.habit_id === habitId && l.date === today)),
    }));
  },

  addMeal: async (input) => {
    const meal = await api.addMeal(input);
    set((s) => ({ todayMeals: [...s.todayMeals, meal], mealHistory: [...s.mealHistory, meal] }));
  },

  removeMeal: async (id) => {
    await api.deleteMeal(id);
    set((s) => ({
      todayMeals: s.todayMeals.filter((m) => m.id !== id),
      mealHistory: s.mealHistory.filter((m) => m.id !== id),
    }));
  },
}));

// ---------- Derived selectors ----------

export const habitsDueToday = (habits: Habit[]): Habit[] => {
  const wd = isoWeekday();
  return habits.filter((h) => h.status === 'active' && h.days_of_week.includes(wd));
};

export const selectTodayStats = (s: AuroraState): TodayStats => {
  const waterMl = s.todayWater.reduce((sum, w) => sum + w.amount_ml, 0);
  const today = todayKey();
  const lastNight = s.sleepLogs.find((l) => l.date === today) ?? null;

  const weekLogs = s.sleepLogs.filter((l) => l.date >= daysAgoKey(7));
  const sleepWeekAvgMin = weekLogs.length
    ? Math.round(weekLogs.reduce((sum, l) => sum + l.duration_min, 0) / weekLogs.length)
    : null;

  const due = habitsDueToday(s.habits);
  const todayLogs = s.habitLogs.filter((l) => l.date === today && l.status === 'completed');
  const completedIds = new Set(todayLogs.map((l) => l.habit_id));

  return {
    waterMl,
    waterGoalMl: s.profile?.water_goal_ml ?? 2500,
    sleepLastNightMin: lastNight?.duration_min ?? null,
    sleepWeekAvgMin,
    habitsDue: due.length,
    habitsCompleted: due.filter((h) => completedIds.has(h.id)).length,
    mealsLogged: s.todayMeals.length,
    calories: s.todayMeals.reduce((sum, m) => sum + m.calories, 0),
    protein_g: s.todayMeals.reduce((sum, m) => sum + m.protein_g, 0),
    carbs_g: s.todayMeals.reduce((sum, m) => sum + m.carbs_g, 0),
    fat_g: s.todayMeals.reduce((sum, m) => sum + m.fat_g, 0),
  };
};

/** Consecutive days (ending today or yesterday) where the day-keyed predicate holds. */
const streakFromDays = (hitDays: Set<string>): number => {
  let streak = 0;
  let cursor = 0;
  // Allow the streak to be "alive" if today hasn't been hit yet
  if (!hitDays.has(daysAgoKey(0))) cursor = 1;
  while (hitDays.has(daysAgoKey(cursor))) {
    streak += 1;
    cursor += 1;
  }
  return streak;
};

export const selectStreaks = (s: AuroraState) => {
  const goal = s.profile?.water_goal_ml ?? 2500;
  const byDay = new Map<string, number>();
  for (const w of s.waterHistory) {
    const k = dateKey(new Date(w.logged_at));
    byDay.set(k, (byDay.get(k) ?? 0) + w.amount_ml);
  }
  const waterDays = new Set([...byDay.entries()].filter(([, ml]) => ml >= goal).map(([k]) => k));

  const sleepGoal = s.profile?.sleep_goal_min ?? 480;
  const sleepDays = new Set(
    s.sleepLogs.filter((l) => l.duration_min >= sleepGoal * 0.875).map((l) => l.date),
  );

  // A habit-day counts when every habit due that day was completed or
  // consciously skipped (skips are excused), with at least one completion.
  const habitDays = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const k = daysAgoKey(i);
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wd = isoWeekday(d);
    const due = s.habits.filter((h) => h.status === 'active' && h.days_of_week.includes(wd));
    if (!due.length) continue;
    const dayLogs = s.habitLogs.filter((l) => l.date === k);
    const completed = new Set(dayLogs.filter((l) => l.status === 'completed').map((l) => l.habit_id));
    const handled = new Set(dayLogs.map((l) => l.habit_id));
    if (completed.size > 0 && due.every((h) => handled.has(h.id))) habitDays.add(k);
  }

  return {
    hydration: streakFromDays(waterDays),
    sleep: streakFromDays(sleepDays),
    habits: streakFromDays(habitDays),
  };
};

/** Per-habit current streak (consecutive scheduled days completed; skips freeze, not break). */
export const habitStreak = (habit: Habit, logs: HabitLog[]): number => {
  const byDate = new Map(
    logs.filter((l) => l.habit_id === habit.id).map((l) => [l.date, l.status]),
  );
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    if (!habit.days_of_week.includes(isoWeekday(d))) continue; // not scheduled — doesn't break streak
    const status = byDate.get(k);
    if (status === 'completed') streak += 1;
    else if (status === 'skipped') continue; // excused — freezes, doesn't break
    else if (i === 0) continue; // today not done yet — streak still alive
    else break;
  }
  return streak;
};
