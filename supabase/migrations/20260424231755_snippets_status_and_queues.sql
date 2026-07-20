-- ============================================================
-- Add status column to snippets for async image-generation queue
-- ============================================================
alter table public.snippets
  add column if not exists status text not null default 'published'
    check (status in ('pending', 'published', 'failed'));

create index if not exists snippets_status_idx on public.snippets (status)
  where status != 'published';

-- ============================================================
-- Enable pgmq extension and create the image-generation queue
-- ============================================================
create extension if not exists pgmq;

select pgmq.create('image_generation');
