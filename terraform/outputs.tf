output "s3_bucket_name" {
  description = "Name of the S3 bucket for static hosting"
  value       = aws_s3_bucket.static_site.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.static_site.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.static_site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.static_site.domain_name
}

output "cloudfront_url" {
  description = "Full URL for the CloudFront distribution"
  value       = "https://${aws_cloudfront_distribution.static_site.domain_name}"
}

output "dynamodb_sightings_table_name" {
  description = "DynamoDB sightings table name"
  value       = aws_dynamodb_table.sightings.name
}

output "dynamodb_sightings_table_arn" {
  description = "DynamoDB sightings table ARN"
  value       = aws_dynamodb_table.sightings.arn
}

output "dynamodb_users_table_name" {
  description = "DynamoDB users table name"
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_users_table_arn" {
  description = "DynamoDB users table ARN"
  value       = aws_dynamodb_table.users.arn
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool domain"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

output "cognito_app_client_id" {
  description = "Cognito App Client ID for the SPA"
  value       = aws_cognito_user_pool_client.spa.id
}

output "lambda_sync_user_arn" {
  description = "ARN of the syncUser Lambda function"
  value       = aws_lambda_function.sync_user.arn
}

output "lambda_record_sighting_arn" {
  description = "ARN of the recordSighting Lambda function"
  value       = aws_lambda_function.record_sighting.arn
}

output "lambda_get_leaderboard_arn" {
  description = "ARN of the getLeaderboard Lambda function"
  value       = aws_lambda_function.get_leaderboard.arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda IAM role"
  value       = aws_iam_role.lambda_role.arn
}

# Environment variables for the React app
output "react_env_vars" {
  description = "Environment variables for React application"
  value = <<-EOT
    # Add these to your .env file
    VITE_COGNITO_USER_POOL_ID=${aws_cognito_user_pool.main.id}
    VITE_COGNITO_CLIENT_ID=${aws_cognito_user_pool_client.spa.id}
    VITE_COGNITO_REGION=${var.aws_region}
    VITE_API_URL=https://your-api-gateway-url
    VITE_CLOUDFRONT_URL=https://${aws_cloudfront_distribution.static_site.domain_name}
    DYNAMODB_SIGHTINGS_TABLE=${aws_dynamodb_table.sightings.name}
    DYNAMODB_USERS_TABLE=${aws_dynamodb_table.users.name}
  EOT
}
