revoke insert on public.issues from authenticated;
grant insert (title, description, created_by,
              workaround_available, customer_impact, team_impact,
              effort_estimate, churn_risk)
  on public.issues to authenticated;