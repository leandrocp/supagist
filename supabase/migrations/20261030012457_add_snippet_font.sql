-- Existing snippets and older publish clients use the composer's System default.
alter table public.snippets
  add column font_id text not null default 'system';

-- Enforce new writes immediately without scanning existing rows under an
-- ACCESS EXCLUSIVE lock. Validate in a separate migration/transaction.
alter table public.snippets
  add constraint snippets_font_id_check
  check (font_id in ('system', 'jetbrains', 'fira', 'geist', 'hack')) not valid;
