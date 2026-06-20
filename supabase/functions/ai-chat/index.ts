// Aurora's agentic brain: GPT with tools that read/write the user's health data.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  contextSummary,
  corsHeaders,
  gatherContext,
  getAuthedClient,
  handleOptions,
  json,
  localDateKey,
  openaiChat,
  openaiTTS,
} from '../_shared/helpers.ts';

const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'log_water',
      description: 'Log water the user drank, in millilitres. A glass ≈ 250ml, a bottle ≈ 500ml.',
      parameters: {
        type: 'object',
        properties: { amount_ml: { type: 'integer', minimum: 1, maximum: 5000 } },
        required: ['amount_ml'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_sleep',
      description:
        "Log last night's sleep. Provide bedtime and wake time as 24h HH:MM local times, or duration_hours if that's all the user said.",
      parameters: {
        type: 'object',
        properties: {
          bedtime: { type: 'string', description: '24h HH:MM, e.g. 23:30' },
          wake_time: { type: 'string', description: '24h HH:MM, e.g. 07:00' },
          duration_hours: { type: 'number', description: 'Use when only a duration was given' },
          quality: { type: 'integer', minimum: 1, maximum: 5 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Create a new habit for the user.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          emoji: { type: 'string', description: 'One emoji that fits the habit' },
          time_of_day: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'anytime'] },
          days_of_week: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 7 },
            description: 'ISO weekdays 1=Mon..7=Sun. Omit for every day.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_habit',
      description: "Mark one of the user's habits as completed (or skipped) today. Use the exact habit name from context.",
      parameters: {
        type: 'object',
        properties: {
          habit_name: { type: 'string' },
          status: { type: 'string', enum: ['completed', 'skipped'], default: 'completed' },
        },
        required: ['habit_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_meal',
      description: 'Log a meal the user ate, estimating calories and macros yourself from the description.',
      parameters: {
        type: 'object',
        properties: {
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          description: { type: 'string' },
          calories: { type: 'integer' },
          protein_g: { type: 'integer' },
          carbs_g: { type: 'integer' },
          fat_g: { type: 'integer' },
        },
        required: ['meal_type', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_habit',
      description:
        'Modify an existing habit: rename it, change its time of day or days, or pause/resume it. Match by the habit name from context.',
      parameters: {
        type: 'object',
        properties: {
          habit_name: { type: 'string', description: 'Existing habit to modify' },
          new_name: { type: 'string' },
          emoji: { type: 'string' },
          time_of_day: { type: 'string', enum: ['morning', 'afternoon', 'evening', 'anytime'] },
          days_of_week: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 7 } },
          status: { type: 'string', enum: ['active', 'paused'] },
        },
        required: ['habit_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_habit',
      description: 'Delete one of the user’s habits permanently. Match by the habit name from context.',
      parameters: {
        type: 'object',
        properties: { habit_name: { type: 'string' } },
        required: ['habit_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description:
        'Save a durable observation about the user worth remembering long-term (preferences, patterns, struggles). Use sparingly for genuinely useful facts.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          category: { type: 'string', enum: ['hydration', 'sleep', 'habits', 'nutrition', 'general'] },
        },
        required: ['content', 'category'],
      },
    },
  },
];

interface ToolResult {
  result: string;
  summary?: string;
}

async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  tzOffsetMin: number,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const today = localDateKey(tzOffsetMin);

  switch (name) {
    case 'log_water': {
      const ml = Number(args.amount_ml);
      const { error } = await supabase.from('water_logs').insert({ user_id: userId, amount_ml: ml });
      if (error) return { result: `Failed: ${error.message}` };
      return { result: `Logged ${ml}ml.`, summary: `Added ${ml}ml of water` };
    }
    case 'log_sleep': {
      let durationMin: number;
      let bedISO: string;
      let wakeISO: string;
      const nowLocal = new Date(Date.now() + tzOffsetMin * 60000);

      if (args.bedtime && args.wake_time) {
        const [bh, bm] = String(args.bedtime).split(':').map(Number);
        const [wh, wm] = String(args.wake_time).split(':').map(Number);
        const wake = new Date(nowLocal);
        wake.setUTCHours(wh, wm, 0, 0);
        const bed = new Date(nowLocal);
        bed.setUTCHours(bh, bm, 0, 0);
        if (bed >= wake) bed.setUTCDate(bed.getUTCDate() - 1);
        durationMin = Math.round((wake.getTime() - bed.getTime()) / 60000);
        bedISO = new Date(bed.getTime() - tzOffsetMin * 60000).toISOString();
        wakeISO = new Date(wake.getTime() - tzOffsetMin * 60000).toISOString();
      } else if (args.duration_hours) {
        durationMin = Math.round(Number(args.duration_hours) * 60);
        const wake = new Date(nowLocal);
        wake.setUTCHours(7, 0, 0, 0);
        const bed = new Date(wake.getTime() - durationMin * 60000);
        bedISO = new Date(bed.getTime() - tzOffsetMin * 60000).toISOString();
        wakeISO = new Date(wake.getTime() - tzOffsetMin * 60000).toISOString();
      } else {
        return { result: 'Failed: need bedtime+wake_time or duration_hours.' };
      }

      const { error } = await supabase.from('sleep_logs').upsert(
        {
          user_id: userId,
          date: today,
          bedtime: bedISO,
          wake_time: wakeISO,
          duration_min: durationMin,
          quality: args.quality ?? null,
        },
        { onConflict: 'user_id,date' },
      );
      if (error) return { result: `Failed: ${error.message}` };
      const h = Math.floor(durationMin / 60);
      const m = durationMin % 60;
      return { result: `Sleep logged: ${h}h${m ? ` ${m}m` : ''}.`, summary: `Logged ${h}h${m ? ` ${m}m` : ''} of sleep` };
    }
    case 'create_habit': {
      const { error } = await supabase.from('habits').insert({
        user_id: userId,
        name: String(args.name),
        emoji: (args.emoji as string) ?? '✨',
        time_of_day: (args.time_of_day as string) ?? 'anytime',
        days_of_week: (args.days_of_week as number[]) ?? [1, 2, 3, 4, 5, 6, 7],
      });
      if (error) return { result: `Failed: ${error.message}` };
      return { result: `Habit "${args.name}" created.`, summary: `Created habit “${args.name}”` };
    }
    case 'complete_habit': {
      const { data: habits } = await supabase.from('habits').select('id,name').eq('status', 'active');
      const target = (habits ?? []).find(
        (h: { name: string }) =>
          h.name.toLowerCase().includes(String(args.habit_name).toLowerCase()) ||
          String(args.habit_name).toLowerCase().includes(h.name.toLowerCase()),
      );
      if (!target) return { result: `No habit matching "${args.habit_name}". Existing: ${(habits ?? []).map((h: { name: string }) => h.name).join(', ')}` };
      const status = (args.status as string) ?? 'completed';
      const { error } = await supabase
        .from('habit_logs')
        .upsert({ habit_id: target.id, user_id: userId, date: today, status }, { onConflict: 'habit_id,date' });
      if (error) return { result: `Failed: ${error.message}` };
      return { result: `"${target.name}" marked ${status}.`, summary: `Marked “${target.name}” ${status}` };
    }
    case 'log_meal': {
      const { error } = await supabase.from('meals').insert({
        user_id: userId,
        meal_type: String(args.meal_type),
        description: String(args.description),
        calories: Number(args.calories) || 0,
        protein_g: Number(args.protein_g) || 0,
        carbs_g: Number(args.carbs_g) || 0,
        fat_g: Number(args.fat_g) || 0,
      });
      if (error) return { result: `Failed: ${error.message}` };
      return { result: `Meal logged (${args.calories} kcal).`, summary: `Logged ${args.meal_type}: ${args.description}` };
    }
    case 'update_habit': {
      const { data: habits } = await supabase.from('habits').select('id,name');
      const target = (habits ?? []).find(
        (h: { name: string }) =>
          h.name.toLowerCase().includes(String(args.habit_name).toLowerCase()) ||
          String(args.habit_name).toLowerCase().includes(h.name.toLowerCase()),
      );
      if (!target) {
        return { result: `No habit matching "${args.habit_name}". Existing: ${(habits ?? []).map((h: { name: string }) => h.name).join(', ')}` };
      }
      const patch: Record<string, unknown> = {};
      if (args.new_name) patch.name = String(args.new_name);
      if (args.emoji) patch.emoji = String(args.emoji);
      if (args.time_of_day) patch.time_of_day = String(args.time_of_day);
      if (args.days_of_week) patch.days_of_week = args.days_of_week;
      if (args.status) patch.status = String(args.status);
      if (!Object.keys(patch).length) return { result: 'Nothing to change.' };
      const { error } = await supabase.from('habits').update(patch).eq('id', target.id);
      if (error) return { result: `Failed: ${error.message}` };
      const label = (patch.name as string) ?? target.name;
      return { result: `Habit updated.`, summary: `Updated habit “${label}”` };
    }
    case 'delete_habit': {
      const { data: habits } = await supabase.from('habits').select('id,name');
      const target = (habits ?? []).find(
        (h: { name: string }) =>
          h.name.toLowerCase().includes(String(args.habit_name).toLowerCase()) ||
          String(args.habit_name).toLowerCase().includes(h.name.toLowerCase()),
      );
      if (!target) {
        return { result: `No habit matching "${args.habit_name}". Existing: ${(habits ?? []).map((h: { name: string }) => h.name).join(', ')}` };
      }
      const { error } = await supabase.from('habits').delete().eq('id', target.id);
      if (error) return { result: `Failed: ${error.message}` };
      return { result: `Habit "${target.name}" deleted.`, summary: `Deleted habit “${target.name}”` };
    }
    case 'save_memory': {
      const { error } = await supabase.from('memories').insert({
        user_id: userId,
        content: String(args.content),
        category: String(args.category),
      });
      if (error) return { result: `Failed: ${error.message}` };
      return { result: 'Memory saved.', summary: 'Remembered something about you' };
    }
    default:
      return { result: `Unknown tool ${name}` };
  }
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await getAuthedClient(req);
    const { message, voice = true, tzOffsetMin = 0 } = await req.json();
    if (!message || typeof message !== 'string') return json({ error: 'message required' }, 400);

    const today = localDateKey(tzOffsetMin);
    const ctx = await gatherContext(supabase, tzOffsetMin);

    const { data: historyRows } = await supabase
      .from('chat_messages')
      .select('role,content')
      .order('created_at', { ascending: false })
      .limit(10);
    const history = (historyRows ?? []).reverse();

    // History is provided as an inert transcript (last few messages only) for
    // tone/continuity. Passing it as real turns made the model replay old tool
    // calls; the instructions below keep it as context, not a to-do list.
    const transcript = history.length
      ? `\n\nEARLIER MESSAGES (context only — for tone and continuity. Do NOT re-run any actions from these; they are already finished):\n${history
          .slice(-6)
          .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`)
          .join('\n')}`
      : '';

    const system = `You are Aurora, a warm personal health companion inside a mobile app. You talk WITH the user by voice, so keep replies natural, conversational, and under 60 words. Be encouraging, never clinical or preachy. Use the user's first name occasionally.

You can take actions with tools (log water/sleep/meals, create/update/delete/complete habits, save memories). When they ask to change or remove a habit, use update_habit/delete_habit — never create a duplicate.

CRITICAL — always fully handle the user's CURRENT message:
- If it reports an activity (food eaten, water drunk, sleep, a habit done), call the matching tool NOW — even if a similar item appears in the earlier messages. People eat dosa two nights running, or retry after a glitch; every current report must be logged.
- NEVER say you logged, added, created, or updated something unless you actually called the tool in THIS turn. No fake confirmations.
- Only skip tools when the user is asking a question or just chatting, not reporting an activity.

When you notice a durable pattern or the user shares a lasting preference/struggle, store it with save_memory.

Today is ${today}.

${contextSummary(ctx, today)}${transcript}`;

    const messages: Record<string, unknown>[] = [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ];

    const actions: { tool: string; summary: string }[] = [];

    let reply = '';
    for (let round = 0; round < 4; round++) {
      const completion = await openaiChat({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.6,
        max_tokens: 350,
      });
      const choice = completion.choices[0].message;

      if (choice.tool_calls?.length) {
        messages.push(choice);
        for (const tc of choice.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || '{}');
          } catch { /* leave empty */ }
          const { result, summary } = await executeTool(supabase, user.id, tzOffsetMin, tc.function.name, args);
          if (summary) actions.push({ tool: tc.function.name, summary });
          messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
        continue;
      }
      reply = choice.content ?? '';
      break;
    }
    if (!reply) reply = 'Done! Anything else I can help you with?';

    // Persist the conversation
    await supabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: reply },
    ]);

    let audioB64: string | undefined;
    if (voice) {
      try {
        audioB64 = await openaiTTS(reply);
      } catch (e) {
        console.error('TTS failed:', e);
      }
    }

    return json({ reply, actions, audioB64 });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: msg }, msg === 'Unauthorized' ? 401 : 500);
  }
});
