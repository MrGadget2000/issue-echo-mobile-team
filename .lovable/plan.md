# Add area trends and time-to-resolve to Reports

The Reports dashboard already covers monthly raised/resolved counts, average open age, a 30-day activity chart, a six-month trend, resolution rate, top reporters and the Issues by Area table. This adds the two views you picked.

## 1. Area trends over time

A new card, "Area trends", showing how each issue area has moved over the last six months.

- A stacked bar chart: one bar per month, segments coloured by issue area, height = issues raised that month.
- Only the areas with activity in that window appear, so the chart stays readable; the remainder roll into "Other areas".
- Under the chart, a compact table: each area with its count for the latest month, the previous month, and an up/down/flat arrow showing the direction, sorted by biggest increase first. This makes "which areas are getting worse" answerable at a glance.

## 2. Time-to-resolve

A new card, "Time to resolve", covering issues that have been closed.

- Three headline numbers: average days to close, median days to close, and the count of closed issues used in the figures.
- A bar chart of average days to close per month over the last six months, so a trend is visible.
- A per-area table: closed count and average days to close for each area, slowest first, so persistent problem areas stand out.
- Issues closed without a recorded close date are excluded and noted, so figures aren't skewed.

Both cards sit below the existing Issues by Area section and use the same card styling, colours and empty-state handling as the rest of the page, so nothing else on the tab changes.

## Technical notes

- All work is in `src/pages/Reports.tsx`: two new `useMemo` blocks (`areaTrends`, `resolutionTimes`) derived from the existing `mockIssues` data plus two new cards. No schema, hook or data-layer changes — `createdAt`, `closedAt`, `closed` and `issueArea` are already loaded by `useIssues`.
- Charts use the existing `recharts` import; the stacked chart adds `Bar` stacking via `stackId` and a `Legend`, chart colours come from semantic design tokens (no hardcoded hex).
- Median is computed on the sorted day-difference array; month buckets reuse the same rolling six-month logic as `metrics.monthlyData` for consistency.
- Admin gating, the lock screen and hook ordering stay exactly as they are.
