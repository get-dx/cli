# NewRelic tables

3 tables. Every join below is stated with the SQL to write.

## newrelic_entities

Details about New Relic entities.

`source` · `lookup` · NewRelic

### Joined from — these point here, one-to-many

- **newrelic_slis**
  ```sql
  JOIN newrelic_entities
    ON newrelic_entities.id = newrelic_slis.entity_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## newrelic_slis

Details about New Relic SLIs (Service Level Indicators).

`source` · `entity` · NewRelic

### Joins out — this table holds the key

- **newrelic_entities**
  ```sql
  JOIN newrelic_entities
    ON newrelic_entities.id = newrelic_slis.entity_id
  ```

### Joined from — these point here, one-to-many

- **newrelic_slos**
  ```sql
  JOIN newrelic_slis
    ON newrelic_slis.id = newrelic_slos.sli_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## newrelic_slos

Details about New Relic SLOs (Service Level Objectives).

`source` · `entity` · NewRelic

### Joins out — this table holds the key

- **newrelic_slis**
  ```sql
  JOIN newrelic_slis
    ON newrelic_slis.id = newrelic_slos.sli_id
  ```
