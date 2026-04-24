# Snapshot Analysis

Use the `dx` CLI snapshot endpoints to turn one snapshot into a concise insight report.

## Workflow

1. Verify DX authentication when this is the first `dx` command in the thread:

   ```bash
   dx auth status
   ```

   If authentication fails, stop and ask the user to run `dx init` or `dx auth login`.

2. Always list snapshots before analyzing one:

   ```bash
   dx snapshots list --json
   ```

3. Determine the target snapshot:
   - If the user already provided a snapshot ID or clearly identified a snapshot, continue with that ID after listing snapshots.
   - If no target snapshot was provided, show the available snapshots with enough context to choose, such as `id`, `scheduled_for`, `completed_at`, and counts. Then ask the user which snapshot ID to analyze. Do not continue until the user chooses one.

4. Fetch snapshot scores:

   ```bash
   dx snapshots info --id <snapshot_id> --json
   ```

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
   - Repeated themes in driver comments and CSAT comments.
   - Differences between quantitative scores and qualitative comments.
   - Teams or items with low response counts that should be treated cautiously.

## Output

Return a concise report with these sections when supported by the data:

- `Snapshot`: selected ID and basic timing/count context.
- `Executive summary`: 3-5 bullets with the strongest signals.
- `Score signals`: notable teams/items, scores, response counts, and benchmark gaps.
- `Comment themes`: recurring themes from driver and CSAT comments, grouped by theme.
- `Outliers or cautions`: low response counts, missing data, or contradictory signals.
- `Recommended follow-ups`: specific questions or slices worth investigating next.

Keep conclusions grounded in the fetched data. If comments are unavailable, say so and produce a score-only analysis. If scores are unavailable, say so and produce a comment-only analysis.
