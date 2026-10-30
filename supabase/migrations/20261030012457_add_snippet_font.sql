-- Existing snippets and older publish clients use the composer's System default.
alter table public.snippets
  add column font_id text not null default 'system'
  constraint snippets_font_id_check check (font_id in ('system', 'jetbrains', 'fira', 'geist', 'hack'));
