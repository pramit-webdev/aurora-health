# Aurora — your personal health companion 🌌

A mobile-first AI health companion built with **Expo + Supabase + OpenAI/Groq** for the Aurora hackathon.

> *Understand yourself better every day.*

- 💧 Hydration with a living, animated water bottle
- 🌙 Sleep logging, trends and consistency scoring
- ✅ Habits with streaks, skip/pause, smart scheduling
- 🥗 Nutrition with **AI macro estimation** from plain text
- 🎙️ **Voice-to-voice AI companion that takes real actions** (logs water/sleep/meals, creates and completes habits) through conversation
- ✨ Daily AI insight generated from your real data
- 🧠 Health memory — Aurora remembers your patterns
- 🏆 Achievements, streaks, weekly/monthly reports

**Architecture:** React Native (Expo SDK 56, expo-router, Reanimated) → Supabase (Postgres + RLS, Auth, Edge Functions) → OpenAI (GPT-4o-mini agent w/ tool calling + TTS) + Groq (Whisper STT). All AI keys live server-side in Edge Functions — the app never sees them.

---

## 1. One-time setup (~20 minutes)

### A. Supabase project

1. Create a free project at [database.new](https://database.new).
2. In **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and **Run**. This creates all tables, the signup trigger, and row-level security.
3. (For the smoothest demo) **Authentication → Sign In / Up → Email** — turn **off** "Confirm email".

### B. Environment for the app

```bash
cp .env.example .env
# Fill in from Supabase Dashboard → Settings → API:
#   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

### C. Deploy the AI backend (Edge Functions)

Install the Supabase CLI ([docs](https://supabase.com/docs/guides/cli)), then:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

# AI provider keys (server-side only)
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set GROQ_API_KEY=gsk_...   # optional but recommended (free fast STT)

# Deploy all four functions
npx supabase functions deploy ai-chat transcribe daily-insight parse-meal
```

### D. (Optional) Google sign-in

Supabase Dashboard → **Authentication → Providers → Google**: follow the wizard (needs a Google Cloud OAuth client). Email auth works without this.

---

## 2. Run it on your phone

```bash
npm install
npx expo start
```

Install **Expo Go** on your Android phone (same Wi-Fi as your computer) and scan the QR code.

---

## 3. Build the submission APK

```bash
npm i -g eas-cli
eas login                # free Expo account
# Put your two EXPO_PUBLIC_ values into eas.json → build.preview.env
eas build -p android --profile preview
```

The build runs in Expo's cloud and returns an installable **APK link** (also visible at expo.dev). That link *is* the Android installation link for submission.

---

## Try saying to Aurora 🎙️

- "How am I doing this week?"
- "I drank 500 ml of water."
- "I slept seven and a half hours last night."
- "Create a habit to meditate every morning."
- "I had paneer rice and salad for lunch."
- "What should I focus on to sleep better?"

Every action Aurora takes appears as a ✓ chip in the conversation and instantly updates the dashboard.

## Project layout

```
src/
  app/            screens (expo-router): welcome, auth, setup wizard, tabs, modules, companion
  components/     design system (ui/), dashboard cards, water bottle, charts, aurora orb
  lib/            supabase client, typed API layer, zustand store, AI client, helpers
supabase/
  schema.sql      full Postgres schema + RLS
  functions/      ai-chat (agent + tools), transcribe (Whisper), daily-insight, parse-meal
```
