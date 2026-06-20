import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';
import type { Insight } from './types';

export interface AgentAction {
  tool: string;
  summary: string;
}

export interface ChatResponse {
  reply: string;
  actions: AgentAction[];
  /** base64 mp3 of the spoken reply (when voice requested) */
  audioB64?: string;
}

/**
 * One full companion turn: send text (typed or transcribed), the edge function
 * runs the agent (GPT + tools that write to the DB), returns reply + TTS audio.
 */
const tzOffsetMin = () => -new Date().getTimezoneOffset();

export async function companionTurn(message: string, opts?: { voice?: boolean }): Promise<ChatResponse> {
  const { data, error } = await supabase.functions.invoke<ChatResponse>('ai-chat', {
    body: { message, voice: opts?.voice ?? true, tzOffsetMin: tzOffsetMin() },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data!;
}

/**
 * Upload recorded audio for transcription via multipart form-data.
 * RN's networking layer reads the file:// URI natively — this sidesteps
 * expo-file-system entirely (its modules can't read the recorder's cache
 * directory inside Expo Go).
 */
export async function transcribeAudio(uri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  // XMLHttpRequest (not fetch): RN's native networking accepts {uri} file
  // parts and reads the recording itself — expo's WinterCG fetch does not.
  const { status, body } = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/functions/v1/transcribe`);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error('Network error during audio upload'));
    xhr.ontimeout = () => reject(new Error('Audio upload timed out'));
    xhr.timeout = 30000;

    const form = new FormData();
    form.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' } as unknown as Blob);
    form.append('format', 'm4a');
    xhr.send(form);
  });

  if (status < 200 || status >= 300) {
    console.log('[stt] upload failed:', status, body.slice(0, 200));
    let message = `Transcription failed (${status})`;
    try {
      message = JSON.parse(body).error ?? message;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  const data = JSON.parse(body) as { text?: string };
  return data.text ?? '';
}

/** Ask the backend to generate (or return existing) insight for today. */
export async function generateDailyInsight(): Promise<Insight | null> {
  const { data, error } = await supabase.functions.invoke<{ insight: Insight | null }>('daily-insight', {
    body: { tzOffsetMin: tzOffsetMin() },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data?.insight ?? null;
}

/** Parse a meal description into macros using the backend. */
export async function parseMeal(description: string): Promise<{
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}> {
  const { data, error } = await supabase.functions.invoke('parse-meal', {
    body: { description },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data as any;
}

async function describeFunctionError(error: any): Promise<string> {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) return body.error;
    }
  } catch {
    // fall through
  }
  return error?.message ?? 'Something went wrong talking to Aurora.';
}
