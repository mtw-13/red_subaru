# API Gateway HTTP API (v2) - More cost-effective than REST API
resource "aws_apigatewayv2_api" "main" {
  name          = "red-subaru-api-${random_id.suffix.hex}"
  protocol_type = "HTTP"
  description   = "Red Subaru Tracker API"

  cors_configuration {
    allow_origins = concat(
      var.allowed_origins,
      ["https://${aws_cloudfront_distribution.static_site.domain_name}"]
    )
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 3600
  }

  tags = {
    Name        = "Red Subaru API"
    Environment = var.environment
  }
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }

  tags = {
    Name        = "Red Subaru API Stage"
    Environment = var.environment
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/red-subaru-${random_id.suffix.hex}"
  retention_in_days = 7

  tags = {
    Name        = "Red Subaru API Logs"
    Environment = var.environment
  }
}

# Integration: Record Sighting Lambda
resource "aws_apigatewayv2_integration" "record_sighting" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.record_sighting.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Integration: Get Leaderboard Lambda
resource "aws_apigatewayv2_integration" "get_leaderboard" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_leaderboard.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route: POST /sightings
resource "aws_apigatewayv2_route" "post_sightings" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /sightings"
  target    = "integrations/${aws_apigatewayv2_integration.record_sighting.id}"
}

# Route: GET /leaderboard
resource "aws_apigatewayv2_route" "get_leaderboard" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /leaderboard"
  target    = "integrations/${aws_apigatewayv2_integration.get_leaderboard.id}"
}

# Lambda permission for API Gateway - Record Sighting
resource "aws_lambda_permission" "api_record_sighting" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.record_sighting.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# Lambda permission for API Gateway - Get Leaderboard
resource "aws_lambda_permission" "api_get_leaderboard" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_leaderboard.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
