-- SHARE UPDATE EXCLUSIVE allows ordinary reads and writes during validation.
alter table public.snippets validate constraint snippets_font_id_check;
