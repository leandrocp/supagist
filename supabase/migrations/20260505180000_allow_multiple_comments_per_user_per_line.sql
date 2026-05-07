-- Allow multiple comments per user per line (GitHub PR-style threads).
-- The original schema enforced one-per-user-per-line via a unique constraint;
-- we now want each user to be able to post a chronological sequence of replies
-- on the same line.
alter table public.snippet_comments
  drop constraint if exists snippet_comments_per_user_per_line;
