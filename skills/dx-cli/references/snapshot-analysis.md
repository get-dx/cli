# Snapshot Analysis

Use the `dx` CLI snapshot endpoints to turn one snapshot into a concise insight report.

## Terms

- **Snapshot**: A completed DX Snapshot survey/reporting cycle. Use `dx snapshots list --json` for IDs, timing, and completion counts before choosing one to analyze.
- **Snapshot team**: A team record frozen at the time of the snapshot. `snapshot_team.parent` identifies parent-rollup rows; `snapshot_team.team_id` links back to the DX team.
- **Snapshot item**: A scored question or metric included in the snapshot. `snapshot.snapshot_items` groups item metadata into `factors`, `csat`, and `kpis`.
- **Developer Experience Index (DXI)**: The overall developer-experience score, calculated from driver scores out of 100. Treat it as a baseline for quarterly progress and as an impact/ROI framing device.
- **Driver / factor**: A developer-experience driver. Product-facing docs and reports call these drivers; the API uses `factor` as the `item_type` and stores metadata in `snapshot_items.factors`.
- **CSAT**: A satisfaction item, commonly for internal tools or services. CSAT score rows use `item_type: "csat"` and CSAT comments come from `dx snapshots csatComments list`.
- **KPI**: A key performance indicator included in the snapshot results. KPI score rows use `item_type: "kpi"` and metadata comes from `snapshot_items.kpis`.
- **Team score**: One `snapshot.team_scores[]` row for a single snapshot team and snapshot item. Join `item_id` to `snapshot_items` to label the row.
- **Response count / contributor count**: Use these fields to judge signal strength and privacy sensitivity. Treat low-count rows cautiously.
- **Comparison fields**: `vs_prev`, `vs_org`, `vs_50th`, `vs_75th`, and `vs_90th` are deltas against the previous snapshot, the organization, and benchmark percentiles.
- **Comments**: Free-text survey feedback fetched separately from driver and CSAT comment endpoints. Use comments to explain score patterns, not to override the numeric data.
- **Triage**: The post-snapshot process of assigning driver follow-up status, commonly `Keep monitoring`, `Make improvements`, or `Needs support`. Triage updates are shared with teams; recommend statuses when useful, but do not submit them for the user.
- **Studies**: Targeted follow-up surveys used to investigate the "why" behind Snapshot trends for specific teams, roles, sentiment groups, or friction points.
- **PlatformX**: Real-time/event-driven feedback and usage intelligence for validating tools, tracking adoption, and measuring sentiment between Snapshot cycles.

## Audience Guidance

Adapt the analysis to the user's role. If the role is unclear, produce a balanced report that separates team-local actions from cross-team/systemic opportunities.

### Engineering managers

- Use the post-snapshot sequence for managers: check DXI, read and acknowledge team feedback, then triage driver results.
- Focus on the manager's team or team subtree when a team is specified. Compare that team against prior results, org results, and benchmarks, but keep the main narrative about what the manager can discuss and influence with their team.
- Lead with the strongest 2-4 signals: DXI baseline and movement, biggest strengths to preserve, biggest risks to investigate, and meaningful changes since the prior snapshot.
- Use driver votes/comments to identify top friction points. Mention heatmap-style patterns when a driver appears organization-wide versus team-specific.
- Convert drivers, CSAT, KPIs, and comments into concrete discussion prompts for the next team conversation. Prefer "ask the team about..." over unsupported root-cause claims.
- Recommend up to three initiatives, each tied to a driver, CSAT item, or KPI, with an owner, next step, expected behavior change, and metric to revisit next Snapshot.
- When triage is relevant, suggest statuses: `Keep monitoring` for healthy drivers, `Make improvements` for team-owned action, and `Needs support` for issues requiring leadership or cross-team help.
- Separate team-local follow-ups from issues that likely need help from platform, DevEx, leadership, or another owning group.
- Preserve trust and anonymity. Do not identify individuals, over-interpret comments from small populations, or treat low `response_count` rows as definitive.
- Do not like, reply to, or otherwise acknowledge comments in DX on the user's behalf unless the user explicitly asks and confirms that representational action.

### DevEx and platform teams

- Use the post-snapshot sequence for DevEx/platform teams: start with CSAT, check DXI, dig into relevant drivers, then suggest Studies or PlatformX for deeper follow-up.
- Start with CSAT when the audience owns tools, internal services, or platform capabilities. Use scores and CSAT comments to identify friction, track satisfaction over time, and determine whether CSAT items need to be configured before the next Snapshot.
- Use CSAT breakdowns to compare by team, previous Snapshot, and sample size. Use heatmap-style interpretation to detect anomalies, compare trends, and focus on teams or cohorts where satisfaction lags the org.
- Use DXI to identify areas for improvement, validate tooling investments, and tell the story of DevEx impact in terms of time saved, quality improvements, or measurable outcomes.
- Treat drivers (`item_type: "factor"`) as the broad developer-experience "why" signal. Review driver scores, trends, and comments, then cross-reference with CSAT to validate priorities.
- Include KPI items when present, especially impact, speed, quality, adoption, or time-loss measures that sharpen prioritization.
- Group comments by platform domain, workflow, tool, or service when the data supports it. Call out whether a theme is broad, team-specific, or only weakly supported.
- Translate findings into product/roadmap opportunities: likely owner, affected audience, expected impact, and the metric or comment theme to monitor in the next Snapshot.
- Recommend Studies when the data shows a trend but not enough root-cause detail. Recommend PlatformX-style follow-up when the issue concerns tool adoption, POCs, usage, sentiment, or mid-cycle feedback.
- Distinguish systemic friction from team execution issues. Recommend partnership with engineering managers when a theme requires local context or behavior change.
- Avoid prioritizing solely by complaint volume. Weigh breadth, severity, benchmark gap, trend, contributor count, and whether the platform team can realistically influence the outcome.

## Workflow

1. Always list snapshots before analyzing one:

   ```bash
   dx snapshots list --json
   ```

2. Determine the target snapshot:
   - If the user already provided a snapshot ID or clearly identified a snapshot, continue with that ID after listing snapshots.
   - If no target snapshot was provided, show the available snapshots with enough context to choose, such as `id`, `scheduled_for`, `completed_at`, and counts. Then ask the user which snapshot ID to analyze. Do not continue until the user chooses one.

3. Fetch snapshot scores:

   ```bash
   dx snapshots info --id <snapshot_id> --json
   ```

4. Interpret the snapshot info response:
   - Read score rows from `snapshot.team_scores`.
   - Read item metadata from `snapshot.snapshot_items`, which contains `factors`, `csat`, and `kpis` arrays.
   - Build an item lookup keyed by item ID so each score row can be labeled from `team_scores[].item_id` and `team_scores[].item_type`.
   - Treat `factor` as the API name for a snapshot driver. In user-facing analysis, call these "drivers" unless you are naming the raw API value.
   - `team_scores[].item_type` is always one of `factor`, `csat`, or `kpi`. Do not invent other item types. Note that `snapshot_items` uses plural collection keys (`factors`, `kpis`) but `item_type` uses singular enum values (`factor`, `kpi`).

5. Fetch all driver comments using pagination:

   ```bash
   dx snapshots driverComments list --id <snapshot_id> --limit 100 --json
   dx snapshots driverComments list --id <snapshot_id> --limit 100 --cursor <next_cursor> --json
   ```

   Continue until `response_metadata.next_cursor` is absent or null.

6. Fetch all CSAT comments using pagination:

   ```bash
   dx snapshots csatComments list --id <snapshot_id> --limit 100 --json
   dx snapshots csatComments list --id <snapshot_id> --limit 100 --cursor <next_cursor> --json
   ```

   Continue until `response_metadata.next_cursor` is absent or null.

7. Analyze the combined data. Prioritize:
   - Lowest and highest team scores, especially with meaningful `response_count`.
   - Large benchmark gaps: `vs_org`, `vs_50th`, `vs_75th`, `vs_90th`.
   - Biggest changes from the prior snapshot using `vs_prev`.
   - Snapshot drivers (`item_type: "factor"`) before CSAT items when other score signals are comparable.
   - CSAT and KPI items that indicate tool satisfaction, workflow impact, speed, quality, adoption, or time loss.
   - Repeated themes in driver comments and CSAT comments.
   - Differences between quantitative scores and qualitative comments.
   - Teams or items with low response counts that should be treated cautiously to respect privacy of individuals.

## Output

Return a concise report with these sections when supported by the data:

- `Snapshot`: selected ID and basic timing/count context.
- `Executive summary`: 3-5 bullets with the strongest signals.
- `Score signals`: notable teams/items, scores, response counts, and benchmark gaps.
- `Comment themes`: recurring themes from driver and CSAT comments, grouped by theme.
- `Outliers or cautions`: low response counts, missing data, or contradictory signals.
- `Recommended follow-ups`: specific questions or slices worth investigating next.

For engineering-manager audiences, make follow-ups team-actionable and discussion-ready, including suggested triage status and up to three initiatives when supported. For DevEx or platform audiences, make follow-ups cross-team, ownership-oriented, and tied to CSAT, DXI, driver, KPI, Studies, or PlatformX prioritization.

Keep conclusions grounded in the fetched data. If comments are unavailable, say so and produce a score-only analysis. If scores are unavailable, say so and produce a comment-only analysis.
