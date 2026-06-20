-- Add raw-audio capture to the STT diagnostic so we can inspect the real format.
alter table public.stt_debug add column if not exists audio_b64 text;
