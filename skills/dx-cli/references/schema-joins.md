# DX Schema Joins

How the 551 tables in DX Data Cloud relate, and the SQL to join them.
800 relationships, each stated with its join. Schema generated 2026-10-09T18:33:32.058Z.

## Finding the answer

Read the reference file for the source in question — do not answer from
memory, and do not infer a join from column names. Each file states every
join for every one of its tables, with the SQL.

| The question                     | Read                                                          |
| -------------------------------- | ------------------------------------------------------------- |
| About a vendor's own tables      | `references/<source>.md`, listed in `references/index.md`     |
| Which sources exist at all       | `references/index.md`                                         |
| Attributing activity to a person | `references/identities.md`                                    |
| Source table or unified table    | `references/source-predicate.md` then `references/unified.md` |
| Which tables an endpoint touches | `references/api.md`                                           |

A table's name gives away its file: `jira_issues` is in `references/jira.md`,
`pull_requests` in `references/unified.md`. If a name is not in the file you
expect, search `references/` for it before saying it does not exist — and say
that it is absent from this snapshot rather than that it does not exist.

## Narrowing to the account

The reference files document everything DX publishes. Any one account has a
fraction of it, and a table can be provisioned yet hold nothing — a join
against an empty table is a confidently wrong answer. When the question is
broad, or when it matters whether data is actually there, check first:

```bash
dx studio query "SELECT relname, n_live_tup FROM pg_stat_user_tables"
```

This needs the `datacloud:query` scope. Confirm it with `dx auth status
--json`, and if it is absent say so rather than quietly answering from the
reference files alone.

Offer the sources the account actually lands data for, rather than listing
everything documented. Leave tables with zero rows out of the options, and
mention them only if asked.

Do not run the user's analytical query for them. Composing the SQL is the
deliverable; verification means checking that a table exists, holds rows,
and that a discriminator literal is real.

## The two caveats that matter most

These produce wrong numbers rather than errors, so carry them into any
answer they touch even if the user did not ask.

**A unified table needs the source predicate.** `issues`, `pull_requests`,
`pull_request_reviews` and `repos` absorb every vendor through a polymorphic
`source_table_id`, and each vendor numbers its rows from 1. Without
`source = '<vendor>'` the join matches one vendor's row against another's
that shares an integer and silently invents data. The literal is not always
the vendor name — take it from `references/source-predicate.md`.

**Check for `dx_user_id` before reaching for `identities`.** Some tables
resolve the person themselves, and on those the direct join is correct;
adding `identities` drops rows whose identity is missing and multiplies the
rest by the person's other accounts. `references/identities.md` says which
applies. Do not decide from the table name.

## Answering

Keep it short. Omit any part that has nothing to say:

1. One line on how the tables relate.
2. The relationships that matter, naming the columns.
3. The SQL, in one `sql` block.
4. Only the caveats that apply to this join.

Do not explain what a foreign key is, do not restate the schema, and do not
pad the answer with caveats that did not apply. After answering, offer the
obvious next hops from that table.
