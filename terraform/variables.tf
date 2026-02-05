variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "allowed_origins" {
  description = "Allowed origins for CORS and Cognito callbacks"
  type        = list(string)
  default     = ["http://localhost:3000"]
}
