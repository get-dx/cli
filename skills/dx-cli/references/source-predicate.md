# The source predicate

`issues`, `pull_requests`, `pull_request_reviews`, `repos` and the other
unified tables absorb every vendor through a polymorphic `source_table_id`,
and each vendor numbers its rows from 1. Without `source = '<vendor>'` the
join matches one vendor's row against another's that shares an integer and
silently invents data.

```sql
JOIN jira_issues
  ON jira_issues.id = issues.source_table_id
 AND issues.source = 'jira'
```

The literal is not always the vendor name: ADO work items arrive as
`ado_boards`, Bitbucket Data Center as `bitbucket_server`. Take it from the
table below rather than guessing.

**`identities.source` is a different vocabulary.** `jira_service_management`
is a valid identity source and appears in no unified table. Never reuse a
literal across the two.

| `source` literal   | Source tables it covers                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `ado`              | `ado_pulls`, `ado_repositories`, `ado_reviews`, `ado_pull_commits`                              |
| `ado_boards`       | `ado_work_items`                                                                                |
| `asana`            | `asana_tasks`                                                                                   |
| `bitbucket`        | `bitbucket_pulls`, `bitbucket_repositories`, `bitbucket_reviews`, `bitbucket_pull_commits`      |
| `bitbucket_server` | `bitbucket_server_pulls`, `bitbucket_server_repositories`, `bitbucket_server_reviews`           |
| `clickup`          | `clickup_tasks`                                                                                 |
| `github`           | `github_pulls`, `github_repositories`, `github_reviews`, `github_pull_commits`, `github_issues` |
| `gitlab`           | `gitlab_merge_requests`, `gitlab_projects`, `gitlab_reviews`, `gitlab_merge_request_commits`    |
| `jira`             | `jira_issues`                                                                                   |
| `linear`           | `linear_issues`                                                                                 |
| `shortcut`         | `shortcut_stories`                                                                              |
