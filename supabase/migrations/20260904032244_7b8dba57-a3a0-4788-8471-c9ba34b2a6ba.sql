-- 1) Server-side vote casting: enforces approval + 30s cooldown and increments votes atomically
create or replace function public.cast_vote(_issue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _last timestamptz;
  _new_votes integer;
begin
  if _uid is null then
    raise exception 'not authenticated';
  end if;
  if not private.is_approved(_uid) then
    raise exception 'not approved';
  end if;

  select max(created_at) into _last
  from public.issue_votes
  where issue_id = _issue_id and user_id = _uid;

  if _last is not null and now() - _last < interval '30 seconds' then
    return jsonb_build_object(
      'ok', false,
      'retry_after_seconds', ceil(extract(epoch from (interval '30 seconds' - (now() - _last))))
    );
  end if;

  insert into public.issue_votes (issue_id, voter_id, user_id)
  values (_issue_id, _uid::text, _uid);

  update public.issues
  set votes = votes + 1, updated_at = now()
  where id = _issue_id
  returning votes into _new_votes;

  if _new_votes is null then
    raise exception 'issue not found';
  end if;

  return jsonb_build_object('ok', true, 'votes', _new_votes);
end;
$$;

revoke all on function public.cast_vote(uuid) from public, anon;
grant execute on function public.cast_vote(uuid) to authenticated;

-- 2) Column-level privileges: approved users can edit content and close/reopen,
--    but cannot touch votes, created_by, created_at, or id
revoke update on public.issues from authenticated;
grant update (title, description, closed, closed_at, closed_by,
              workaround_available, customer_impact, team_impact,
              effort_estimate, churn_risk, updated_at)
  on public.issues to authenticated;

-- 3) Tighten the update policy with WITH CHECK so closed_by cannot be forged
drop policy if exists "Approved users can update issues" on public.issues;
create policy "Approved users can update issues"
on public.issues
for update
to authenticated
using (private.is_approved(auth.uid()))
with check (
  private.is_approved(auth.uid())
  and (closed_by is null or closed_by = auth.uid()::text)
);