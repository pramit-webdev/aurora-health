// Generates one personalized insight per day from the user's real data.
import {
  contextSummary,
  gatherContext,
  getAuthedClient,
  handleOptions,
  json,
  localDateKey,
  openaiChat,
} from '../_shared/helpers.ts';

const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { supabase, user } = await getAuthedClient(req);
    const body = await req.json().catch(() => ({}));
    const tzOffsetMin = body.tzOffsetMin ?? 0;
    const today = localDateKey(tzOffsetMin);

    // Return today's insight if it already exists
    const { data: existing } = await supabase.from('insights').select('*').eq('date', today).maybeSingle();
    if (existing) return json({ insight: existing });

    const ctx = await gatherContext(supabase, tzOffsetMin);

    const completion = await openaiChat({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You write the single daily insight shown at the top of a health app dashboard. Based on the user's data, write ONE specific, personal, encouraging insight (max 28 words). Reference actual numbers or patterns when available. If there's little data yet, write a warm, motivating nudge for today. Plain text only — no quotes, no emoji at the start.`,
        },
        { role: 'user', content: contextSummary(ctx, today) },
      ],
      temperature: 0.8,
      max_tokens: 80,
    });
    const content: string = completion.choices[0].message.content?.trim() ?? 'Drink a glass of water and take one small step today. 💙';

    const { data: insight, error } = await supabase
      .from('insights')
      .insert({ user_id: user.id, date: today, content })
      .select()
      .single();
    if (error) {
      // Likely raced with another request — return whatever exists
      const { data: raced } = await supabase.from('insights').select('*').eq('date', today).maybeSingle();
      return json({ insight: raced ?? { content, date: today } });
    }
    return json({ insight });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: msg }, msg === 'Unauthorized' ? 401 : 500);
  }
});
