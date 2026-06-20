# Aurora — Project Documentation 🌌

> **Understand yourself better every day.**
> A mobile-first, AI-powered health companion built for the Aurora hackathon.

Aurora is not another health tracker that just collects data. It's a calm, premium companion that **understands** your data and that you can **talk to** — a voice agent that logs your water, sleep, meals and habits through natural conversation, surfaces personalized insights, and gently builds consistency.

---

## 1. Table of Contents
1. Overview & Vision
2. Feature Map (vs. hackathon brief)
3. Architecture
4. Tech Stack
5. Project Structure
6. Data Model (Postgres schema)
7. The AI & Voice Pipeline (core feature)
8. Design System
9. Setup From Scratch
10. Build & Submission (APK)
11. Helper Scripts
12. Known Issues & Gotchas (READ THIS)
13. Pre-Submission Cleanup
14. Roadmap

---

## 2. Overview & Vision

| | |
|---|---|
| **Platform** | Android (React Native via Expo) — iOS-capable, cross-platform code |
| **Backend** | Supabase (Postgres + Auth + Edge Functions), fully API-driven |
| **AI** | OpenAI (GPT-4o-mini agent + TTS) · Groq (Whisper STT) |
| **Core differentiator** | A voice-to-voice **agent** that takes real actions on your data |
| **Design ethos** | Personal, intelligent, supportive, premium, calm |

---

## 3. Feature Map (vs. brief)

| Brief requirement | Status | Where |
|---|---|---|
| Intro / landing (5 onboarding screens + tagline) | ✅ | `welcome.tsx` |
| Auth: Email sign-up/login | ✅ | `(auth)/sign-up.tsx`, `sign-in.tsx` |
| Auth: Continue with Google | ✅ | `GoogleButton.tsx`, `lib/oauth.ts` (PKCE flow) |
| Auth: Continue with Apple | ⚪️ Skipped (needs paid Apple dev acct; not relevant on Android) |
| User onboarding (personal/lifestyle/goals/notifications) | ✅ | `setup.tsx` (5-step wizard) |
| Health data setup (manual vs device) | ✅ | `setup.tsx` step "How you track" |
| Home dashboard (6 cards) | ✅ | `(tabs)/index.tsx`, `dashboard/cards.tsx` |
| Hydration module + **virtual water bottle** | ✅ | `hydration.tsx`, `WaterBottle.tsx` |
| Sleep module (logging, trends, consistency) | ✅ | `sleep.tsx` |
| Habit tracking (create/complete/skip/pause/edit) | ✅ | `(tabs)/habits.tsx`, `habit-form.tsx` |
| Nutrition (AI macro estimation) | ✅ | `nutrition.tsx`, `parse-meal` function |
| **Agentic voice companion (voice-to-voice + actions)** | ✅ | `companion.tsx`, `ai-chat` function |
| Personalized recommendations | ✅ | agent + `daily-insight` |
| Health memory system | ✅ | `memories` table + `save_memory` tool |
| Progress & reports (weekly/monthly) | ✅ | `(tabs)/trends.tsx` |
| Streak system + achievements | ✅ | `trends.tsx`, `store.ts` (streak logic) |
| Notifications (local reminders) | ✅ | `lib/notifications.ts` |
| Profile & settings | ✅ | `(tabs)/profile.tsx` |
| Device integrations (bonus) | ⚪️ Roadmap (shown as "coming soon" in onboarding) |

---

## 4. Architecture

```
┌─────────────────────────────┐
│   Aurora App (Expo / RN)    │
│  expo-router · Reanimated   │
│  zustand store · SVG charts │
└───────────┬─────────────────┘
            │ HTTPS (supabase-js + fetch/XHR)
            ▼
┌─────────────────────────────────────────────┐
│            Supabase (cloud)                  │
│  • Auth (email + Google OAuth)               │
│  • Postgres + Row-Level Security             │
│  • Edge Functions (Deno):                    │
│      ai-chat · transcribe · daily-insight ·  │
│      parse-meal                              │
└───────────┬───────────────────┬──────────────┘
            │                   │
            ▼                   ▼
   ┌──────────────┐     ┌──────────────┐
   │   OpenAI     │     │    Groq      │
   │ GPT-4o-mini  │     │ Whisper STT  │
   │ + TTS (nova) │     │ (large-v3)   │
   └──────────────┘     └──────────────┘
```

**Key principle:** the app never holds AI keys. All AI calls go through Supabase Edge Functions, which hold the secrets and enforce auth. The app only ever talks to Supabase.

---

## 5. Tech Stack

- **Mobile:** React Native 0.85, Expo SDK 56, expo-router (typed routes), React Compiler
- **Animation:** react-native-reanimated v4, react-native-svg (charts, rings, water bottle, aurora orb)
- **State:** zustand (single store, `useShallow` for derived selectors)
- **Audio:** expo-audio (recording + TTS playback)
- **Auth/OAuth:** @supabase/supabase-js, expo-auth-session, expo-web-browser
- **Notifications:** expo-notifications (local daily reminders)
- **Backend:** Supabase — Postgres, Auth, Edge Functions (Deno + `jsr:@supabase/supabase-js`)
- **AI:** OpenAI `gpt-4o-mini` (agent w/ tool calling) + `gpt-4o-mini-tts` (voice nova); Groq `whisper-large-v3-turbo` (STT, free tier) with OpenAI `whisper-1` fallback
- **Build:** EAS Build (cloud) → standalone Android APK

---

## 6. Project Structure

```
aurora/
├── src/
│   ├── app/                       # expo-router screens
│   │   ├── _layout.tsx            # root: fonts, session provider, stack
│   │   ├── index.tsx              # routing gate (welcome / setup / tabs)
│   │   ├── welcome.tsx            # 5-screen onboarding carousel
│   │   ├── setup.tsx              # 5-step profile wizard
│   │   ├── companion.tsx          # 🎙️ voice agent (modal)
│   │   ├── hydration.tsx · sleep.tsx · nutrition.tsx · habit-form.tsx
│   │   ├── (auth)/                # sign-in, sign-up
│   │   └── (tabs)/                # index(dashboard), habits, trends, profile
│   ├── components/
│   │   ├── ui/                    # design system (AText, Button, Card, …)
│   │   ├── dashboard/cards.tsx    # the 6 dashboard cards
│   │   ├── hydration/WaterBottle.tsx
│   │   ├── charts/BarChart.tsx
│   │   ├── AuroraOrb.tsx · GoogleButton.tsx
│   ├── lib/
│   │   ├── supabase.ts            # client + AppState token refresh
│   │   ├── api.ts                 # typed data layer (all DB ops)
│   │   ├── store.ts               # zustand store + derived selectors (streaks, stats)
│   │   ├── ai.ts                  # edge-function clients (chat, transcribe, …)
│   │   ├── oauth.ts               # Google PKCE flow
│   │   ├── notifications.ts · dates.ts · types.ts
│   ├── constants/theme.ts         # palette, fonts, spacing, radius
│   └── hooks/use-session.ts
├── supabase/
│   ├── schema.sql                 # full schema + RLS (reference)
│   ├── migrations/                # applied migrations
│   └── functions/                 # Deno edge functions
│       ├── _shared/helpers.ts     # auth, context-gathering, OpenAI helpers
│       ├── ai-chat/               # the agent (tool calling)
│       ├── transcribe/            # Whisper STT
│       ├── daily-insight/         # personalized daily insight
│       └── parse-meal/            # meal → macros
├── scripts/                       # smoke-test, seed-demo, reset-user, generate-icons
├── assets/images/                 # generated icon set
├── README.md · DEMO.md · DEMO_SCRIPT.md · TESTING.md · DOCUMENTATION.md
├── app.json · eas.json · .env(.example)
```

---

## 7. Data Model (Postgres)

All tables have **Row-Level Security**: a user can only ever read/write rows where `auth.uid()` matches. A signup trigger auto-creates a `profiles` row.

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | user profile + goals + prefs | name, age, goals[], water_goal_ml, sleep_goal_min, notification_prefs, onboarding_complete |
| `water_logs` | hydration entries | amount_ml, logged_at |
| `sleep_logs` | nightly sleep (1/day) | date, bedtime, wake_time, duration_min, quality |
| `habits` | habit definitions | name, emoji, time_of_day, days_of_week[], status |
| `habit_logs` | per-day completion | habit_id, date, status (completed/skipped) |
| `meals` | logged meals | meal_type, description, calories, protein_g, carbs_g, fat_g |
| `insights` | one AI insight/day | date, content |
| `memories` | durable observations | content, category |
| `chat_messages` | companion history | role, content |

Full DDL: [`supabase/schema.sql`](supabase/schema.sql).

---

## 8. The AI & Voice Pipeline (core feature)

### Voice-to-voice round trip
```
User taps orb → expo-audio records (m4a) →
  upload to `transcribe` (Groq Whisper) → transcript →
  `ai-chat` (GPT-4o-mini agent) → runs tools (writes to DB) + reply text →
  OpenAI TTS → mp3 → played back → dashboard refreshes
```

### The agent (`ai-chat`)
A GPT-4o-mini agent with **8 tools** that write directly to the user's data (under RLS):

| Tool | Action |
|---|---|
| `log_water` | add a hydration entry |
| `log_sleep` | log last night (bedtime/wake or duration) |
| `log_meal` | log a meal with AI-estimated macros |
| `create_habit` | create a habit |
| `complete_habit` | mark a habit done/skipped today |
| `update_habit` | rename / reschedule / pause / resume |
| `delete_habit` | remove a habit |
| `save_memory` | store a durable observation about the user |

The agent receives a **context summary** (today's totals, weekly sleep avg, active habits, recent memories) so its replies and actions are personalized. Recent chat is passed as an **inert transcript** (context only) so the agent never re-executes old requests, while always acting on the current message.

### Other functions
- **`transcribe`** — Groq `whisper-large-v3-turbo` (free, fast) with OpenAI `whisper-1` fallback. Accepts multipart upload (RN) or base64. Filters Whisper silence-hallucinations ("thank you", etc.) and forces `language=en`, `temperature=0`.
- **`daily-insight`** — generates one personalized insight per day from real data (cached per day).
- **`parse-meal`** — turns a plain-text meal ("dal, rice and salad") into estimated calories + macros.

---

## 9. Design System

- **Palette:** deep navy night-sky background with an "aurora" gradient (teal → indigo → violet → pink). Per-module accent colors (hydration blue, sleep violet, habit green, nutrition amber, streak orange).
- **Type:** Sora (display/headings) + Manrope (body) via `@expo-google-fonts`.
- **Signature visuals:** the breathing **Aurora Orb** (the companion's "face"), the **virtual water bottle** with a living wave surface, animated progress rings & bars, sonar rings while listening.
- **Feel:** haptics on every action, smooth Reanimated transitions, dark-first, calm.
- Primitives in `src/components/ui/` (`AText`, `Button`, `Card`, `Chip`, `Input`, `ProgressBar`, `ProgressRing`, `Screen`).

---

## 10. Setup From Scratch

**Live project:** Supabase ref `mgzkwieamccnjnqgxpnx` (region: South Asia / Mumbai). EAS project: `@crores_pramit/aurora-health`.

To stand up a fresh copy, follow [`README.md`](README.md). Summary:
1. Create a Supabase project → run `supabase/schema.sql` in the SQL editor.
2. `cp .env.example .env` → fill `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Set Edge secrets: `OPENAI_API_KEY`, `GROQ_API_KEY` (+ Google OAuth in Supabase Auth → Providers).
4. `supabase functions deploy ai-chat transcribe daily-insight parse-meal`.
5. `npm install && npx expo start` (Expo Go) to develop.

**Auth config:** email confirmation is **off** (frictionless demo). Google uses the PKCE flow; redirect allowlist includes `aurora://` (APK) and `exp://` (dev).

---

## 11. Build & Submission (APK)

```bash
eas build -p android --profile preview     # cloud build → installable APK link
```
- `eas.json` → `preview` profile produces an **APK** (not AAB) with the `EXPO_PUBLIC_*` env baked in.
- The APK link from expo.dev **is** the Android installation link for submission.
- Verify on-device after install (APK ≠ Expo Go): Google sign-in, voice, notifications.

**Submission checklist:** ① APK link · ② 3–5 min demo video (see [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md)).

---

## 12. Helper Scripts

| Script | Purpose |
|---|---|
| `node scripts/smoke-test.js` | 7-check backend health (auth, RLS, all AI functions). Run before every demo/submit. |
| `node scripts/seed-demo.js <email>` | Seed 7 days of realistic history (water/sleep/habits/meals) → full streaks, charts, all achievements; leaves today empty for live voice demo. |
| `bash scripts/reset-user.sh [email]` | Delete a user + all their data (cascades). Default `pramitdasml@gmail.com`. For fresh demo runs. |
| `node scripts/generate-icons.js` | Regenerate the app icon/splash set from inline SVG. |

---

## 13. Known Issues & Gotchas (READ THIS) ⚠️

1. **🎤 Screen recorder steals the mic.** Android lets only **one** app use the microphone at a time. If you screen-record **with mic audio ON**, the recorder grabs the mic and Aurora hears **silence**. **Fix:** set the screen recorder's audio to **Internal/Media audio** (mic OFF) so the app keeps the mic — or film the phone with a **second camera** (best for a voice demo: captures your voice + Aurora's reply naturally). *This was the cause of every "voice not working" issue during demo recording — the app itself is fine.*

2. **OEM mic throttling on sideloaded APKs.** Some Android skins (Xiaomi/Realme/Oppo/Vivo) restrict mic for apps installed outside the Play Store. Grant **"Allow all the time"** mic permission, disable battery optimization, and enable Autostart for Aurora.

3. **Whisper "Thank you." hallucination.** On silent/too-short audio, Whisper invents "Thank you." The `transcribe` function filters these and the app shows "didn't catch that." Speak clearly for 2–4 seconds.

4. **Google sign-in needs the APK** (not Expo Go) — Expo Go's dev redirect strips the OAuth code. Works in the standalone APK via the `aurora://` scheme + PKCE code exchange.

5. **Local notifications** only fire in the **standalone APK**, not Expo Go (Android SDK 53+).

---

## 14. Pre-Submission Cleanup

Before final submission, do these (all server-side, no rebuild needed):
- [ ] Remove the **`stt_debug`** diagnostic: drop the table and the debug insert block in `supabase/functions/transcribe/index.ts`, then redeploy `transcribe`.
- [ ] Purge test users: `johndoe@gmail.com`, `aurora.test@example.com` (via `reset-user.sh <email>`).
- [ ] Run `node scripts/smoke-test.js` → confirm 7/7 green.
- [ ] (Optional) Configure Google OAuth consent screen to "Published" so any user can sign in.

---

## 15. Roadmap
- Device integrations: Health Connect, Fitbit, Garmin (UI already hints "coming soon").
- Push notifications (currently local-only).
- Apple sign-in + iOS TestFlight build.
- Real-time voice (streaming) via OpenAI Realtime API.
- Richer memory/RAG over long-term history.

---

*Built with React Native, Supabase, and an agentic AI pipeline. Voice in, real action taken, voice out — in seconds.* 🌌
