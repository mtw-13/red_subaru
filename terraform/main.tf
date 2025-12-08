# Red Subaru Tracker - Terraform Configuration
# This sets up all AWS resources needed for the serverless web app

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 Bucket for frontend hosting
resource "aws_s3_bucket" "frontend" {
  bucket = "red-subaru-tracker-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "RedSubaru-Frontend"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket policy for CloudFront
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFront"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_principal  = aws_cloudfront_origin_access_identity.frontend.iam_arn
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.frontend.id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 3600
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "RedSubaru-CloudFront"
  }
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "red-subaru-oac"
  description                       = "OAC for Red Subaru Tracker S3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_identity" "frontend" {
  comment = "RedSubaru frontend OAI"
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "red-subaru-tracker"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  auto_verified_attributes = ["email"]

  tags = {
    Name = "RedSubaru-UserPool"
  }
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "red-subaru-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "frontend" {
  name            = "red-subaru-frontend"
  user_pool_id    = aws_cognito_user_pool.main.id
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  callback_urls = [
    "http://localhost:3000",
    "https://${aws_cloudfront_distribution.frontend.domain_name}"
  ]

  logout_urls = [
    "http://localhost:3000",
    "https://${aws_cloudfront_distribution.frontend.domain_name}"
  ]

  allowed_oauth_flows          = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = [
    "email",
    "openid"
  ]
}

# DynamoDB Table
resource "aws_dynamodb_table" "sightings" {
  name           = "red-subaru-sightings"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_email"
  range_key      = "sort_key"

  attribute {
    name = "user_email"
    type = "S"
  }

  attribute {
    name = "sort_key"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  # Global Secondary Index for querying by date
  global_secondary_index {
    name            = "date-index"
    hash_key        = "user_email"
    range_key       = "date"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiration"
    enabled        = false
  }

  tags = {
    Name = "RedSubaru-Sightings"
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "red-subaru-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
  }

  tags = {
    Name = "RedSubaru-API"
  }
}

# API Gateway Authorizer (Cognito)
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "JWT"
  identity_source  = "$request.header.Authorization"
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.frontend.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "red-subaru-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Lambda DynamoDB Access
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name   = "lambda-dynamodb-policy"
  role   = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.sightings.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query"
        ]
        Resource = "${aws_dynamodb_table.sightings.arn}/index/*"
      }
    ]
  })
}

# IAM Policy for CloudWatch Logs
resource "aws_iam_role_policy" "lambda_logs" {
  name   = "lambda-logs-policy"
  role   = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Lambda function for data entry
resource "aws_lambda_function" "data_entry" {
  filename      = "data_entry_lambda.zip"
  function_name = "red-subaru-data-entry"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.sightings.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_dynamodb,
    aws_iam_role_policy.lambda_logs
  ]
}

# Lambda function for querying
resource "aws_lambda_function" "query" {
  filename      = "query_lambda.zip"
  function_name = "red-subaru-query"
  role          = aws_iam_role.lambda_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.sightings.name
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda_dynamodb,
    aws_iam_role_policy.lambda_logs
  ]
}

# API Gateway Integration for data entry
resource "aws_apigatewayv2_integration" "data_entry" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_method = "POST"
  payload_format_version = "2.0"
  target = aws_lambda_function.data_entry.arn
}

# API Gateway Integration for query
resource "aws_apigatewayv2_integration" "query" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_method = "POST"
  payload_format_version = "2.0"
  target = aws_lambda_function.query.arn
}

# API Gateway Route for POST /sightings
resource "aws_apigatewayv2_route" "post_sightings" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /sightings"
  target    = "integrations/${aws_apigatewayv2_integration.data_entry.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# API Gateway Route for GET /sightings/query
resource "aws_apigatewayv2_route" "get_sightings_query" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /sightings/query"
  target    = "integrations/${aws_apigatewayv2_integration.query.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "prod"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = {
    Name = "RedSubaru-API-Prod"
  }
}

# CloudWatch Log Group for API
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/red-subaru-api"
  retention_in_days = 7

  tags = {
    Name = "RedSubaru-API-Logs"
  }
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "api_data_entry" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.data_entry.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_query" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.query.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Data source for AWS account ID
data "aws_caller_identity" "current" {}

# Outputs
output "s3_bucket_name" {
  description = "S3 bucket for frontend hosting"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_domain" {
  description = "Cognito Domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "api_endpoint" {
  description = "API Gateway endpoint"
  value       = aws_apigatewayv2_stage.main.invoke_url
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.sightings.name
}
