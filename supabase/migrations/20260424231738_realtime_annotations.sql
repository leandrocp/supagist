-- Enable Realtime for collaborative annotation tables.
-- REPLICA IDENTITY FULL ensures DELETE payloads include all columns,
-- so the client can identify which line lost a reaction/comment.
alter table public.snippet_line_reactions replica identity full;
alter table public.snippet_comments replica identity full;

alter publication supabase_realtime add table public.snippet_line_reactions;
alter publication supabase_realtime add table public.snippet_comments;
