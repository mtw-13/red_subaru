# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_role" {
  name = "red-subaru-lambda-role-${random_id.suffix.hex}"

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

  tags = {
    Name        = "Red Subaru Lambda Role"
    Environment = var.environment
  }
}

# IAM Policy for DynamoDB Access
resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "red-subaru-lambda-dynamodb-${random_id.suffix.hex}"
  description = "IAM policy for Lambda to access DynamoDB tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.sightings.arn,
          "${aws_dynamodb_table.sightings.arn}/index/*",
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.users.arn}/index/*"
        ]
      }
    ]
  })
}

# IAM Policy for CloudWatch Logs
resource "aws_iam_policy" "lambda_logs_policy" {
  name        = "red-subaru-lambda-logs-${random_id.suffix.hex}"
  description = "IAM policy for Lambda to write CloudWatch logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      }
    ]
  })
}

# Attach policies to role
resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_logs_policy.arn
}

# Lambda function: syncUser (Cognito Trigger)
resource "aws_lambda_function" "sync_user" {
  filename         = data.archive_file.sync_user.output_path
  function_name    = "red-subaru-sync-user-${random_id.suffix.hex}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.sync_user.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      USERS_TABLE = aws_dynamodb_table.users.name
    }
  }

  tags = {
    Name        = "Red Subaru Sync User"
    Environment = var.environment
  }
}

# Lambda function: recordSighting (API Gateway)
resource "aws_lambda_function" "record_sighting" {
  filename         = data.archive_file.record_sighting.output_path
  function_name    = "red-subaru-record-sighting-${random_id.suffix.hex}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.record_sighting.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      SIGHTINGS_TABLE = aws_dynamodb_table.sightings.name
      USERS_TABLE     = aws_dynamodb_table.users.name
    }
  }

  tags = {
    Name        = "Red Subaru Record Sighting"
    Environment = var.environment
  }
}

# Lambda function: getLeaderboard (API Gateway)
resource "aws_lambda_function" "get_leaderboard" {
  filename         = data.archive_file.get_leaderboard.output_path
  function_name    = "red-subaru-get-leaderboard-${random_id.suffix.hex}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.get_leaderboard.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      SIGHTINGS_TABLE = aws_dynamodb_table.sightings.name
    }
  }

  tags = {
    Name        = "Red Subaru Get Leaderboard"
    Environment = var.environment
  }
}

# Archive Lambda source code
# IMPORTANT: Run the build script before terraform apply to install dependencies
# cd ../lambda && ./build.ps1  (Windows) or ./build.sh (Linux/Mac)

data "archive_file" "sync_user" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/syncUser"
  output_path = "${path.module}/.lambda_zips/syncUser.zip"
}

data "archive_file" "record_sighting" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/recordSighting"
  output_path = "${path.module}/.lambda_zips/recordSighting.zip"
}

data "archive_file" "get_leaderboard" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/getLeaderboard"
  output_path = "${path.module}/.lambda_zips/getLeaderboard.zip"
}

# Cognito trigger permission
resource "aws_lambda_permission" "cognito_trigger" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sync_user.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
