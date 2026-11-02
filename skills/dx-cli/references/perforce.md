# Perforce tables

9 tables. Every join below is stated with the SQL to write.

## perforce_changelist_depots

Join table linking changelists to the depot(s) they affected.

`source` · `bridge` · Perforce

### Joins out — this table holds the key

- **perforce_changelists**
  ```sql
  JOIN perforce_changelists
    ON perforce_changelists.id = perforce_changelist_depots.changelist_id
  ```
- **perforce_depots**
  ```sql
  JOIN perforce_depots
    ON perforce_depots.id = perforce_changelist_depots.depot_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## perforce_changelists

Details about Perforce changelists (submitted changes).

`source` · `entity` · Perforce

### Joins out — this table holds the key

- **perforce_repositories**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_changelists.repository_id
  ```
- **perforce_users**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_changelists.user_id
  ```

### Bridges — join through, never to

- **perforce_changelist_depots**
  ```sql
  JOIN perforce_changelists
    ON perforce_changelists.id = perforce_changelist_depots.changelist_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## perforce_depots

Details about Perforce depots (top-level storage containers).

`source` · `entity` · Perforce

### Joins out — this table holds the key

- **perforce_repositories**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_depots.repository_id
  ```
- **perforce_users**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_depots.owner_id
  ```

### Bridges — join through, never to

- **perforce_changelist_depots**
  ```sql
  JOIN perforce_depots
    ON perforce_depots.id = perforce_changelist_depots.depot_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## perforce_group_members

Association between Perforce users and groups.

`source` · `bridge` · Perforce

### Joins out — this table holds the key

- **perforce_users**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_group_members.user_id
  ```
- **perforce_groups**
  ```sql
  JOIN perforce_groups
    ON perforce_groups.id = perforce_group_members.group_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## perforce_groups

Details about Perforce groups.

`source` · `entity` · Perforce

### Joins out — this table holds the key

- **perforce_repositories**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_groups.repository_id
  ```

### Bridges — join through, never to

- **perforce_group_members**
  ```sql
  JOIN perforce_groups
    ON perforce_groups.id = perforce_group_members.group_id
  ```

## perforce_repositories

Details about your Perforce server instances.

`source` · `entity` · Perforce

### Joined from — these point here, one-to-many

- **perforce_users**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_users.repository_id
  ```
- **perforce_groups**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_groups.repository_id
  ```
- **perforce_depots**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_depots.repository_id
  ```
- **perforce_changelists**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_changelists.repository_id
  ```
- **perforce_reviews**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_reviews.repository_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Perforce id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## perforce_review_activities

Details about activities on Perforce Swarm code reviews.

`source` · `entity` · Perforce

### Joins out — this table holds the key

- **perforce_reviews**
  ```sql
  JOIN perforce_reviews
    ON perforce_reviews.id = perforce_review_activities.review_id
  ```
- **perforce_users**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_review_activities.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## perforce_reviews

Details about Perforce Swarm code reviews.

`source` · `entity` · Perforce

### Joins out — this table holds the key

- **perforce_repositories**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_reviews.repository_id
  ```
- **perforce_users**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_reviews.user_id
  ```
- **perforce_users**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_reviews.merged_by_user_id
  ```

### Joined from — these point here, one-to-many

- **perforce_review_activities**
  ```sql
  JOIN perforce_reviews
    ON perforce_reviews.id = perforce_review_activities.review_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins perforce_users 2 different ways** — user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining perforce_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## perforce_users

Details about Perforce users.

`source` · `entity` · Perforce

### Joins out — this table holds the key

- **perforce_repositories**
  ```sql
  JOIN perforce_repositories
    ON perforce_repositories.id = perforce_users.repository_id
  ```

### Joined from — these point here, one-to-many

- **perforce_depots**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_depots.owner_id
  ```
- **perforce_changelists**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_changelists.user_id
  ```
- **perforce_reviews**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_reviews.user_id
  ```
- **perforce_reviews**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_reviews.merged_by_user_id
  ```
- **perforce_review_activities**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_review_activities.user_id
  ```
- **identities** — perforce identity · **requires `source = 'perforce' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  perforce_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = perforce_users.id
   AND identities.source = 'perforce'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **perforce_group_members**
  ```sql
  JOIN perforce_users
    ON perforce_users.id = perforce_group_members.user_id
  ```
