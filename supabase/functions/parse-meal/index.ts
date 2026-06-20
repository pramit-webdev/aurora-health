// Parses a plain-text meal description into estimated macros.
import { getAuthedClient, handleOptions, json, openaiChat } from '../_shared/helpers.ts';

const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await getAuthedClient(req);
    const { description } = await req.json();
    if (!description) return json({ error: 'description required' }, 400);

    const completion = await openaiChat({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a nutrition estimator. Given a meal description, estimate realistic totals. Reply ONLY with JSON: {"meal_type":"breakfast|lunch|dinner|snack","description":"cleaned up description","calories":int,"protein_g":int,"carbs_g":int,"fat_g":int}. Assume typical portion sizes for anything unspecified.',
        },
        { role: 'user', content: String(description) },
      ],
      temperature: 0.2,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}');
    return json({
      meal_type: ['breakfast', 'lunch', 'dinner', 'snack'].includes(parsed.meal_type) ? parsed.meal_type : 'snack',
      description: parsed.description ?? String(description),
      calories: Math.max(0, Math.round(parsed.calories ?? 0)),
      protein_g: Math.max(0, Math.round(parsed.protein_g ?? 0)),
      carbs_g: Math.max(0, Math.round(parsed.carbs_g ?? 0)),
      fat_g: Math.max(0, Math.round(parsed.fat_g ?? 0)),
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: msg }, msg === 'Unauthorized' ? 401 : 500);
  }
});
