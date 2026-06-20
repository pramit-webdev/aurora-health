# Aurora — Manual End-to-End Test Script (48 checks)

Go in order. Mark each ✅ / ❌. Report failures by step number (e.g. "step 14: bottle didn't move").
Screenshots only for visual issues — runtime errors stream to the live monitor automatically.

---

## Phase 1 — First impressions (fresh user)

- [ ] 1. Open the app. Expect: welcome carousel, tagline "Understand yourself better every day,"
       breathing orb, smooth swiping through all 5 pages, dots advancing.
- [ ] 2. Tap Skip on page 1 → jumps to sign-up. Android back button → returns sanely.
- [ ] 3. On sign-up, submit an EMPTY form → friendly validation popup, no crash.
- [ ] 4. Try a short password ("123") → clear validation message.
- [ ] 5. Sign up: tester1@example.com / test1234 → straight into setup wizard (no email confirmation).

## Phase 2 — Setup wizard

- [ ] 6. Step 1: empty name → Continue disabled. Fill name/age/height/weight, pick gender.
- [ ] 7. Step 2: pick wake/bed times; change activity level a few times → highlights correctly.
- [ ] 8. Step 3: continue with NO goals → blocked. Pick 2–3 goals.
- [ ] 9. Step 4: water goal reflects your weight (70kg ≈ ~2450ml). Toggle a switch.
       "Let's begin" → dashboard greets you by name.

## Phase 3 — Hydration

- [ ] 10. Hydration card → bottle at 0%.
- [ ] 11. Quick-add 250ml → wave rises, percentages update, haptic tick.
- [ ] 12. Custom amount (330) → appears in Today's log with timestamp.
- [ ] 13. Add water past the goal → "Goal reached 🎉", ring at 100%.
- [ ] 14. Delete a log entry (✕ → confirm) → totals and bottle drop.
- [ ] 15. 7-day chart: today highlighted, matches total. Dashboard card reflects everything.

## Phase 4 — Sleep

- [ ] 16. Set bedtime/wake crossing midnight (11:30 PM → 7:00 AM) → duration = 7h 30m.
- [ ] 17. Pick mood emoji → Save → "last night" stat + chart update.
- [ ] 18. Update the same night with different times → replaces, does NOT duplicate.

## Phase 5 — Habits

- [ ] 19. Habits tab: friendly empty state. Create from suggestion ("Meditate").
- [ ] 20. Create custom habit: name, emoji, time of day, unselect some weekdays → save.
- [ ] 21. Tap circle to complete → line-through, green tint, haptic. Tap again to un-complete.
- [ ] 22. Long-press → Skip today → "skipped today" label, dashed circle.
- [ ] 23. Long-press → Pause → dimmed "paused". Resume it.
- [ ] 24. Long-press → Edit → rename → saves correctly.
- [ ] 25. Create a throwaway habit → Delete → confirmation, then gone.

## Phase 6 — Nutrition

- [ ] 26. Describe a meal ("2 rotis, dal and a salad") → ✨ Estimate macros → numbers in seconds.
- [ ] 27. Log meal → grouped under meal type with macros + time.
- [ ] 28. Log another WITHOUT estimating → saves with "macros not estimated".
- [ ] 29. Delete a meal. Dashboard nutrition card totals match.

## Phase 7 — 🎙️ Voice companion (critical)

- [ ] 30. Tap glowing mic → modal slides up, orb breathing, suggestion chips visible.
- [ ] 31. First mic use → permission prompt → Allow.
- [ ] 32. Orb → "I drank 500 ml of water" → stop. Words appear → Aurora replies OUT LOUD →
        green ✓ "Added 500ml of water" chip.
- [ ] 33. Back to dashboard → hydration updated with no manual refresh.
- [ ] 34. Voice: "Create a habit to read before bed" → exists in Habits tab.
- [ ] 35. Voice: "How am I doing today?" → spoken answer with YOUR real numbers, NO ✓ chips.
- [ ] 36. Voice: "I had a banana as a snack" → meal logged with estimated calories.
- [ ] 37. Tap orb while Aurora is speaking → she stops.
- [ ] 38. Keyboard toggle → type "What should I focus on this week?" → reply arrives.
- [ ] 39. Silent 1-second recording → graceful "didn't catch that", no crash.
- [ ] 40. Close + reopen companion → conversation history persists.

## Phase 8 — Intelligence & progress

- [ ] 41. Dashboard Daily Insight is personalized (mentions your actual data).
- [ ] 42. Trends: consistency score > 0, charts match data, achievements unlocked, Week/Month toggle.
- [ ] 43. Profile: name + goal chips; edit water goal → changes propagate; notification toggles work.
- [ ] 44. "What Aurora remembers about you" — may hold a memory if you shared something personal.

## Phase 9 — Resilience

- [ ] 45. Pull-to-refresh dashboard → smooth, numbers unchanged.
- [ ] 46. Kill the app, reopen → still logged in, data intact, lands on dashboard.
- [ ] 47. Airplane mode → log water → error alert (no crash). Back online → retry works.
- [ ] 48. Sign out → welcome screen. Sign back in → all data exactly as left.

---

### Known dev-mode quirks (NOT bugs — ignore in Expo Go)
- Yellow/dark "GO_BACK" banner at startup: dev-only warning, absent in the APK.
- "Continue with Google" may hang in Expo Go: dev-shell limitation; verify in the APK.
