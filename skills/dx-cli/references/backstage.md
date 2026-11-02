# Backstage tables

8 tables. Every join below is stated with the SQL to write.

## backstage_applications

Details about Backstage applications deployed for your account.

`source` · `lookup` · Backstage

### Joined from — these point here, one-to-many

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_applications
    ON backstage_applications.id = backstage_catalog_entities.application_id
  ```

## backstage_catalog_entities

Details about Backstage software catalog entities.

`source` · `entity` · Backstage

### Joins out — this table holds the key

- **backstage_applications**
  ```sql
  JOIN backstage_applications
    ON backstage_applications.id = backstage_catalog_entities.application_id
  ```

### Joined from — these point here, one-to-many

- **backstage_catalog_entity_annotations**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_annotations.entity_id
  ```
- **backstage_catalog_entity_labels**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_labels.entity_id
  ```
- **backstage_catalog_entity_links**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_links.entity_id
  ```
- **backstage_catalog_entity_profiles**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_profiles.entity_id
  ```
- **backstage_catalog_entity_tags**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_tags.entity_id
  ```

### Bridges — join through, never to

- **backstage_catalog_entity_relations**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.entity_ref = backstage_catalog_entity_relations.source_entity_ref
  ```
- **backstage_catalog_entity_relations**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.entity_ref = backstage_catalog_entity_relations.target_entity_ref
  ```

## backstage_catalog_entity_annotations

Details of the Entity annotations defined in Backstage.

`source` · `entity` · Backstage

### Joins out — this table holds the key

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_annotations.entity_id
  ```

## backstage_catalog_entity_labels

Details of the Entity labels defined in Backstage.

`source` · `entity` · Backstage

### Joins out — this table holds the key

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_labels.entity_id
  ```

## backstage_catalog_entity_links

Details of the Entity links defined in Backstage.

`source` · `entity` · Backstage

### Joins out — this table holds the key

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_links.entity_id
  ```

## backstage_catalog_entity_profiles

Profile details of a given entity. Can be either a User or Group entity.

`source` · `entity` · Backstage

### Joins out — this table holds the key

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_profiles.entity_id
  ```

## backstage_catalog_entity_relations

Details of the relationships between catalog entities in Backstage.
Relations in this table can be understood as `source_entity_ref` - `type` - `target_entity_ref`.
i.e. `component:app` - `ownedBy` - `group:developers`.

`source` · `bridge` · Backstage

### Joins out — this table holds the key

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.entity_ref = backstage_catalog_entity_relations.source_entity_ref
  ```
- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.entity_ref = backstage_catalog_entity_relations.target_entity_ref
  ```

### Caveats

- **Joins backstage_catalog_entities 2 different ways** — source_entity_ref, target_entity_ref. These are separate columns that frequently hold different values, so joining backstage_catalog_entities once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## backstage_catalog_entity_tags

Details of the Entity tags defined in Backstage.

`source` · `entity` · Backstage

### Joins out — this table holds the key

- **backstage_catalog_entities**
  ```sql
  JOIN backstage_catalog_entities
    ON backstage_catalog_entities.id = backstage_catalog_entity_tags.entity_id
  ```
