# Architecture rules

- Keep the home-page activity ticker in a dedicated component using existing issue data and read-only poll queries, so it does not change reporting or voting behaviour.
- Store team membership separately from profiles and manage it through admin-checked RPCs; database triggers capture immutable submission hierarchies, so membership changes cannot rewrite history or grant privileges.
- Retrieve poll team aggregates through a result-gated RPC, so team breakdowns never bypass voting visibility rules.