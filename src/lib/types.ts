export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export type HealthGoal =
  | 'hydration'
  | 'sleep'
  | 'habits'
  | 'nutrition'
  | 'energy'
  | 'consistency';

export interface NotificationPrefs {
  hydration: boolean;
  sleep: boolean;
  habits: boolean;
  insights: boolean;
}

export interface Profile {
  id: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  wake_time: string | null; // 'HH:MM'
  bed_time: string | null; // 'HH:MM'
  activity_level: ActivityLevel | null;
  goals: HealthGoal[];
  notification_prefs: NotificationPrefs;
  water_goal_ml: number;
  sleep_goal_min: number;
  onboarding_complete: boolean;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string; // ISO timestamp
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD' — the morning the user woke up
  bedtime: string; // ISO timestamp
  wake_time: string; // ISO timestamp
  duration_min: number;
  quality: number | null; // 1..5
}

export type HabitStatus = 'active' | 'paused';
export type HabitLogStatus = 'completed' | 'skipped';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  time_of_day: TimeOfDay;
  /** ISO weekday numbers 1 (Mon) … 7 (Sun) the habit is scheduled on */
  days_of_week: number[];
  status: HabitStatus;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  status: HabitLogStatus;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  user_id: string;
  meal_type: MealType;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  content: string;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  category: 'hydration' | 'sleep' | 'habits' | 'nutrition' | 'general';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/** Aggregate the dashboard + voice agent both consume */
export interface TodayStats {
  waterMl: number;
  waterGoalMl: number;
  sleepLastNightMin: number | null;
  sleepWeekAvgMin: number | null;
  habitsDue: number;
  habitsCompleted: number;
  mealsLogged: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
