-- Allow users to delete their own reactions and comments. The original
-- schema enabled RLS on these tables but only declared SELECT/INSERT/UPDATE
-- policies, so DELETE was silently denied: the client got no error, the
-- server affected 0 rows, and reactions reappeared on refresh.

create policy "snippet_line_reactions_delete_own"
  on public.snippet_line_reactions for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "snippet_comments_delete_own"
  on public.snippet_comments for delete to authenticated
  using (author_id = (select auth.uid()));
