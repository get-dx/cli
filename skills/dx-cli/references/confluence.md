# Confluence tables

5 tables. Every join below is stated with the SQL to write.

## confluence_page_labels

Labels associated with Confluence pages.

`source` · `entity` · Confluence

### Joins out — this table holds the key

- **confluence_pages**
  ```sql
  JOIN confluence_pages
    ON confluence_pages.id = confluence_page_labels.page_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## confluence_page_versions

Details about Confluence page versions.

`source` · `entity` · Confluence

### Joins out — this table holds the key

- **confluence_pages**
  ```sql
  JOIN confluence_pages
    ON confluence_pages.id = confluence_page_versions.page_id
  ```
- **confluence_users**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_page_versions.author_id
  ```

## confluence_pages

Details about Confluence pages.

`source` · `entity` · Confluence

### Joins out — this table holds the key

- **confluence_spaces**
  ```sql
  JOIN confluence_spaces
    ON confluence_spaces.id = confluence_pages.space_id
  ```
- **confluence_users**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_pages.author_id
  ```
- **confluence_users**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_pages.owner_id
  ```
- **confluence_users**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_pages.last_owner_id
  ```

### Joined from — these point here, one-to-many

- **confluence_page_versions**
  ```sql
  JOIN confluence_pages
    ON confluence_pages.id = confluence_page_versions.page_id
  ```
- **confluence_page_labels**
  ```sql
  JOIN confluence_pages
    ON confluence_pages.id = confluence_page_labels.page_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins confluence_users 3 different ways** — author_id, owner_id, last_owner_id. These are separate columns that frequently hold different values, so joining confluence_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## confluence_spaces

Details about Confluence spaces.

`source` · `entity` · Confluence

### Joins out — this table holds the key

- **confluence_users**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_spaces.author_id
  ```

### Joined from — these point here, one-to-many

- **confluence_pages**
  ```sql
  JOIN confluence_spaces
    ON confluence_spaces.id = confluence_pages.space_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## confluence_users

Details about Confluence users.

`source` · `lookup` · Confluence

### Joined from — these point here, one-to-many

- **confluence_spaces**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_spaces.author_id
  ```
- **confluence_pages**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_pages.author_id
  ```
- **confluence_pages**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_pages.owner_id
  ```
- **confluence_pages**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_pages.last_owner_id
  ```
- **confluence_page_versions**
  ```sql
  JOIN confluence_users
    ON confluence_users.id = confluence_page_versions.author_id
  ```
- **identities** — confluence identity · **requires `source = 'confluence' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  confluence_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = confluence_users.id
   AND identities.source = 'confluence'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
