# DynamoDB Table for Sightings
# Using provisioned capacity to stay within AWS Free Tier (25 RCU/WCU)
resource "aws_dynamodb_table" "sightings" {
  name         = "red-subaru-sightings-${random_id.suffix.hex}"
  billing_mode = "PROVISIONED"
  hash_key     = "PK"
  range_key    = "SK"

  # Free tier: 25 RCU and 25 WCU shared across all tables
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Global Secondary Index for queries by date (leaderboard, recent sightings)
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
    read_capacity   = 5
    write_capacity  = 5
  }

  # Point-in-time recovery disabled to save costs
  point_in_time_recovery {
    enabled = false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # TTL (optional, disabled by default)
  ttl {
    attribute_name = "TTL"
    enabled        = false
  }

  tags = {
    Name        = "Red Subaru Sightings"
    Environment = var.environment
  }
}

# DynamoDB Table for Users (synced from Cognito)
# Using provisioned capacity to stay within AWS Free Tier (25 RCU/WCU)
resource "aws_dynamodb_table" "users" {
  name         = "red-subaru-users-${random_id.suffix.hex}"
  billing_mode = "PROVISIONED"
  hash_key     = "userId"

  # Free tier: 25 RCU and 25 WCU shared across all tables
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  # GSI for email lookups
  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
    read_capacity   = 5
    write_capacity  = 5
  }

  # Point-in-time recovery disabled to save costs
  point_in_time_recovery {
    enabled = false
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Red Subaru Users"
    Environment = var.environment
  }
}
