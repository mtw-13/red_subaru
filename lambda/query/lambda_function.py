import json
import boto3
from datetime import datetime
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])

def lambda_handler(event, context):
    """
    Queries sightings within a date range for the authenticated user.
    Token validation is handled by API Gateway authorizer.
    """
    
    try:
        # Get query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        start_date = query_params.get('startDate')
        end_date = query_params.get('endDate')
        
        # Validation
        if not start_date or not end_date:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing startDate or endDate parameters'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        # Validate date format (YYYY-MM-DD)
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid date format. Use YYYY-MM-DD'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        # Extract user from authorizer context
        user_email = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', 'unknown')
        
        # Query DynamoDB
        # This is a simplified query - adjust based on your schema
        # You may want to use a GSI (Global Secondary Index) for efficient queries
        response = table.scan(
            FilterExpression='user_email = :email AND #date BETWEEN :start AND :end',
            ExpressionAttributeNames={
                '#date': 'date'
            },
            ExpressionAttributeValues={
                ':email': user_email,
                ':start': start_date,
                ':end': end_date
            }
        )
        
        items = response.get('Items', [])
        
        # Sort items by date
        items.sort(key=lambda x: x.get('date', ''))
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'items': items,
                'count': len(items),
                'startDate': start_date,
                'endDate': end_date
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
