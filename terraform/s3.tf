# S3 Bucket for Static Website Hosting
resource "aws_s3_bucket" "static_site" {
  bucket = local.bucket_name

  tags = {
    Name        = "Red Subaru Static Site"
    Environment = var.environment
  }
}

# Block public access (CloudFront will serve content)
resource "aws_s3_bucket_public_access_block" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket versioning disabled to save storage costs
resource "aws_s3_bucket_versioning" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  versioning_configuration {
    status = "Disabled"
  }
}

# Bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "static_site" {
  bucket = aws_s3_bucket.static_site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.static_site.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_cloudfront_distribution.static_site]
}

# CORS configuration for the bucket
resource "aws_s3_bucket_cors_configuration" "static_site" {
  bucket = aws_s3_bucket.static_site.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
