#!/bin/bash
# Deployment script for Red Subaru Tracker

set -e

echo "=== Red Subaru Tracker Deployment Script ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform not found. Please install Terraform >= 1.0${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install AWS CLI${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 not found. Please install Python 3${NC}"
    exit 1
fi

if ! command -v zip &> /dev/null; then
    echo -e "${RED}zip not found. Please install zip${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites found${NC}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $ACCOUNT_ID"

# Create Lambda ZIP files
echo -e "${YELLOW}Creating Lambda deployment packages...${NC}"

# Data Entry Lambda
cd lambda/data-entry
rm -f lambda_function.zip
pip install -q boto3 -t .
zip -r ../../terraform/data_entry_lambda.zip . > /dev/null
cd ../..
echo -e "${GREEN}✓ data_entry_lambda.zip created${NC}"

# Query Lambda
cd lambda/query
rm -f lambda_function.zip
pip install -q boto3 -t .
zip -r ../../terraform/query_lambda.zip . > /dev/null
cd ../..
echo -e "${GREEN}✓ query_lambda.zip created${NC}"

# Deploy with Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
cd terraform
terraform init -upgrade

echo -e "${YELLOW}Running Terraform plan...${NC}"
terraform plan

echo -e "${YELLOW}Applying Terraform configuration...${NC}"
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    terraform apply -auto-approve
else
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo -e "${YELLOW}Retrieving outputs...${NC}"
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
API_ENDPOINT=$(terraform output -raw api_endpoint)
COGNITO_CLIENT_ID=$(terraform output -raw cognito_client_id)
COGNITO_DOMAIN=$(terraform output -raw cognito_domain)

cd ..

# Deploy frontend
echo -e "${YELLOW}Uploading frontend to S3...${NC}"
aws s3 cp frontend/index.html "s3://${S3_BUCKET}/index.html" --content-type "text/html"
echo -e "${GREEN}✓ Frontend deployed${NC}"

# Display deployment summary
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Frontend URL: https://${CLOUDFRONT_DOMAIN}"
echo "API Endpoint: ${API_ENDPOINT}"
echo ""
echo -e "${YELLOW}IMPORTANT: Update frontend/index.html with:${NC}"
echo "  const API_GATEWAY_URL = '${API_ENDPOINT}';"
echo "  const COGNITO_CLIENT_ID = '${COGNITO_CLIENT_ID}';"
echo "  const COGNITO_DOMAIN = 'https://${COGNITO_DOMAIN}.auth.us-east-1.amazoncognito.com';"
echo ""
echo "Then redeploy frontend:"
echo "  aws s3 cp frontend/index.html s3://${S3_BUCKET}/index.html --content-type 'text/html'"
echo ""
