# AWS tables

2 tables. Every join below is stated with the SQL to write.

## aws_resources

Unified table for all AWS resources (EC2, RDS, Lambda, S3, EKS, ElastiCache, VPC, security groups, IAM roles, SQS, SNS, DynamoDB).

`source` · `lookup` · AWS

### Joined from — these point here, one-to-many

- **aws_tags**
  ```sql
  JOIN aws_resources
    ON aws_resources.id = aws_tags.resource_id
  ```

## aws_tags

Tags associated with AWS resources.

`source` · `entity` · AWS

### Joins out — this table holds the key

- **aws_resources**
  ```sql
  JOIN aws_resources
    ON aws_resources.id = aws_tags.resource_id
  ```
