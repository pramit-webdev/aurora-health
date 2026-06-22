// Speech-to-text: Groq Whisper (fast + free tier) with OpenAI Whisper fallback.
import { getAuthedClient, handleOptions, json } from '../_shared/helpers.ts';

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function whisper(url: string, apiKey: string, model: string, bytes: Uint8Array, format: string) {
  const form = new FormData();
  form.append('file', new Blob([bytes.buffer as ArrayBuffer], { type: `audio/${format}` }), `audio.${format}`);
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('language', 'en'); // user speaks English — improves accuracy, cuts hallucination
  form.append('temperature', '0');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.text as string;
}

// Phrases Whisper invents for silent/unclear audio — never real commands here.
const HALLUCINATIONS = new Set([
  'thank you.', 'thank you', 'thanks for watching.', 'thanks for watching!',
  'thank you for watching.', 'thank you for watching!', 'thank you very much.',
  'you', '.', 'bye.', 'bye bye.', 'please subscribe.', 'subtitles by the amara.org community',
  'i', 'so', 'okay.', 'mm-hmm.', 'mm.',
]);

const isHallucination = (t: string) => HALLUCINATIONS.has(t.trim().toLowerCase());

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await getAuthedClient(req); // auth gate

    let bytes: Uint8Array;
    let format = 'm4a';
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      // RN clients upload the recording directly as a file part
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'file part required' }, 400);
      bytes = new Uint8Array(await file.arrayBuffer());
      format = (form.get('format') as string) || 'm4a';
    } else {
      const { audioB64, format: f = 'm4a' } = await req.json();
      if (!audioB64) return json({ error: 'audioB64 required' }, 400);
      bytes = b64ToBytes(audioB64);
      format = f;
    }
    if (bytes.length === 0) return json({ error: 'empty audio' }, 400);

    let text = '';
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (groqKey) {
      try {
        text = await whisper(
          'https://api.groq.com/openai/v1/audio/transcriptions',
          groqKey,
          'whisper-large-v3-turbo',
          bytes,
          format,
        );
      } catch (e) {
        console.error('Groq STT failed, falling back to OpenAI:', e);
      }
    }
    if (!text) {
      text = await whisper(
        'https://api.openai.com/v1/audio/transcriptions',
        Deno.env.get('OPENAI_API_KEY')!,
        'whisper-1',
        bytes,
        format,
      );
    }

    // Drop hallucinated transcripts from silent/unclear audio so the app shows
    // "didn't catch that" instead of a nonsense reply.
    if (isHallucination(text)) text = '';

    return json({ text });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return json({ error: msg }, msg === 'Unauthorized' ? 401 : 500);
  }
});
