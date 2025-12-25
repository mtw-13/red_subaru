# Red Subaru Tracker - Serverless Web App

A serverless web application for tracking red Subaru sightings. Users can sign in, log sightings with dates, and query statistics for date ranges.

## Architecture

```
User → Route 53 → CloudFront → S3 (index.html)
                         ↓
                  Cognito (Login)
                         ↓
                  API Gateway (Secured)
                         ↓
                    Lambda (Logic)
                         ↓
                   DynamoDB (Storage)
```

## Components

### Frontend
- **S3 + CloudFront**: Hosts the static web app with HTTPS and caching
- **Cognito**: User authentication and token generation
- **HTML/CSS/JS**: Responsive UI for login, data entry, and querying

### Backend
- **API Gateway**: HTTP endpoints with Cognito JWT authorization
- **Lambda Functions**:
  - `data-entry`: Receives POST requests with sighting data, validates tokens, stores in DynamoDB
  - `query`: Handles GET requests to retrieve statistics for date ranges
- **DynamoDB**: NoSQL database for storing sighting records

## Prerequisites

- AWS Account with appropriate permissions
- Terraform >= 1.0
- AWS CLI configured with credentials
- Python 3.11 (for local Lambda testing)

## File Structure

```
red_subaru/
├── frontend/
│   └── index.html           # Single-page app with Cognito SDK
├── lambda/
│   ├── data-entry/
│   │   └── lambda_function.py  # POST handler
│   └── query/
│       └── lambda_function.py  # GET handler
├── terraform/
│   ├── main.tf              # Infrastructure definition
│   └── variables.tf         # Configuration variables
├── README.md                # This file
└── deploy.sh                # Deployment script
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/mtw-13/red_subaru.git
cd red_subaru
```

### 2. Prepare Lambda Functions

The Lambda functions need to be packaged as ZIP files for Terraform.

Linux / macOS (bash):

```bash
# Data Entry Lambda
cd lambda/data-entry
pip install -q boto3 -t .
zip -r ../../terraform/data_entry_lambda.zip .
cd ../..

# Query Lambda
cd lambda/query
pip install -q boto3 -t .
zip -r ../../terraform/query_lambda.zip .
cd ../..
```

Windows (PowerShell):

```powershell
# From repo root
# Uses built-in Compress-Archive; no need to bundle boto3 (included in Lambda runtime)
Compress-Archive -Path lambda\data-entry\* -DestinationPath terraform\data_entry_lambda.zip -Force
Compress-Archive -Path lambda\query\* -DestinationPath terraform\query_lambda.zip -Force
```

Or run the provided helper script:

```powershell
# Interactive deployment helper (creates ZIPs, runs Terraform)
.\deploy.ps1
```

### 3. Deploy Infrastructure with Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply configuration
terraform apply
```

This will:
- Create S3 bucket for frontend hosting
- Set up CloudFront distribution
- Create Cognito user pool and client
- Deploy DynamoDB table
- Create API Gateway with authorizers
- Deploy Lambda functions
- Configure all IAM roles and policies

### 4. Deploy Frontend

After Terraform deployment, retrieve the S3 bucket name from outputs:

```bash
# Get S3 bucket name
S3_BUCKET=$(terraform output -raw s3_bucket_name)

# Upload index.html to S3
aws s3 cp ../frontend/index.html s3://$S3_BUCKET/index.html --content-type "text/html"
```

### 5. Configure Frontend

Update the frontend configuration in `index.html` with your AWS resources:

```javascript
// In index.html, update these constants:
const API_GATEWAY_URL = 'https://YOUR-API-ENDPOINT-HERE'; // From terraform output
const COGNITO_CLIENT_ID = 'YOUR-CLIENT-ID'; // From terraform output
const COGNITO_DOMAIN = 'https://your-domain.auth.region.amazoncognito.com';
const COGNITO_REGION = 'us-east-1'; // Your AWS region
```

## API Endpoints

### POST /sightings
Log a new sighting

**Request:**
```json
{
  "date": "2025-12-08",
  "count": 3
}
```

**Headers:**
```
Authorization: Bearer <cognito-id-token>
Content-Type: application/json
```

**Response:**
```json
{
  "message": "Sighting recorded successfully",
  "data": {
    "user_email": "user@example.com",
    "date": "2025-12-08",
    "count": 3,
    "timestamp": "2025-12-08T15:30:45.123456"
  }
}
```

### GET /sightings/query
Query sightings within a date range

**Query Parameters:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD

**Headers:**
```
Authorization: Bearer <cognito-id-token>
```

**Response:**
```json
{
  "items": [
    {
      "date": "2025-12-07",
      "count": 2,
      "user_email": "user@example.com"
    },
    {
      "date": "2025-12-08",
      "count": 3,
      "user_email": "user@example.com"
    }
  ],
  "count": 2,
  "startDate": "2025-12-07",
  "endDate": "2025-12-08"
}
```

## User Flow

1. **Visit**: User opens CloudFront URL
2. **Sign Up/Login**: Creates account or logs in via Cognito
3. **Get Token**: JavaScript receives ID token from Cognito
4. **Log Sighting**: Enters date and Subaru count, POST sent with token in Authorization header
5. **API Validation**: API Gateway validates token with Cognito
6. **Store Data**: Lambda receives request, validates, adds timestamp, writes to DynamoDB
7. **Query**: User enters date range and gets statistics
8. **Retrieve**: Lambda queries DynamoDB and returns results

## Security

- **Authentication**: AWS Cognito handles user sign-up and login
- **Authorization**: API Gateway validates JWT tokens before routing to Lambda
- **HTTPS**: CloudFront enforces HTTPS for all traffic
- **Data Isolation**: DynamoDB queries filter by user email, ensuring users only see their own data
- **Private Bucket**: S3 bucket is not publicly accessible; CloudFront is the only entry point
- **IAM Least Privilege**: Lambda functions have minimal permissions (DynamoDB access only)

## Monitoring

CloudWatch Logs are automatically configured for:
- API Gateway requests and responses
- Lambda function executions
- Errors and exceptions

View logs in AWS Console:
```bash
# View API logs
aws logs tail /aws/apigateway/red-subaru-api --follow

# View Lambda logs
aws logs tail /aws/lambda/red-subaru-data-entry --follow
aws logs tail /aws/lambda/red-subaru-query --follow
```

## Cost Estimation

**Monthly costs (estimated for light usage):**
- **S3**: $0.50 (storage) + $0.10 (requests)
- **CloudFront**: $0.085/GB (typically ~$1-5)
- **Cognito**: Free tier (up to 50,000 MAU)
- **API Gateway**: $0.35 per million requests (~$0-5)
- **Lambda**: Free tier (1M requests/month, 400,000 GB-seconds) → $0-2
- **DynamoDB**: $1.25/GB per month (on-demand pricing)

**Typical total: $3-15/month**

## Cleanup

To remove all resources and avoid charges:

```bash
# Delete S3 bucket contents
aws s3 rm s3://red-subaru-tracker-ACCOUNT-ID --recursive

# Destroy Terraform resources
terraform destroy
```

## Troubleshooting

### Cognito Token Errors
- Ensure Client ID and Domain are correctly configured in `index.html`
- Check that callback URLs in Cognito Client include your CloudFront domain

### API Gateway 403 Errors
- Verify JWT token is in `Authorization` header with `Bearer ` prefix
- Check Cognito User Pool ID and Client ID match in authorizer configuration
- Ensure user is authenticated and has valid token

### Lambda Timeout
- Check CloudWatch logs for specific errors
- Verify DynamoDB table exists and IAM role has permissions
- Increase Lambda timeout in Terraform if needed

### DynamoDB Query Empty Results
- Verify date format is YYYY-MM-DD
- Check that sightings exist in date range
- Confirm user email filtering is correct

## Next Steps

1. **Custom Domain**: Add Route 53 hosted zone and certificate for custom domain
2. **Cognito Customization**: Brand login page, add MFA, configure email templates
3. **Analytics**: Add CloudWatch dashboards and custom metrics
4. **Database**: Consider DynamoDB Streams for real-time updates
5. **Mobile App**: Build native iOS/Android app with Amplify
6. **Notifications**: Add SNS for milestone alerts (e.g., "100 Subarus logged!")

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review Terraform state: `terraform show`
3. Verify AWS credentials: `aws sts get-caller-identity`
4. Check IAM permissions for user/role

## License

MIT License - see LICENSE file for details
