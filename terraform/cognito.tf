# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "Red Subaru User Pool"

  # Username configuration
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User attribute schema
  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  schema {
    name                     = "name"
    attribute_data_type      = "String"
    required                 = false
    mutable                  = true
    developer_only_attribute = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Red Subaru - Verify your email"
    email_message        = "Your verification code is {####}"
  }

  # MFA configuration
  mfa_configuration = "OFF"

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "OFF"
  }

  # Post-confirmation Lambda trigger to sync users to DynamoDB
  lambda_config {
    post_confirmation = aws_lambda_function.sync_user.arn
  }

  tags = {
    Name        = "Red Subaru User Pool"
    Environment = var.environment
  }
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "red-subaru-${random_id.suffix.hex}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# Cognito User Pool Client (SPA App)
resource "aws_cognito_user_pool_client" "spa" {
  name         = "Red Subaru SPA App"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret for SPA (public client)
  generate_secret = false

  # Token validity
  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO"]

  # Callback URLs (update with actual domain in production)
  callback_urls = concat(
    var.allowed_origins,
    ["https://${aws_cloudfront_distribution.static_site.domain_name}"]
  )

  logout_urls = concat(
    var.allowed_origins,
    ["https://${aws_cloudfront_distribution.static_site.domain_name}"]
  )

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read and write attributes
  read_attributes  = ["email", "name", "email_verified"]
  write_attributes = ["email", "name"]
}
