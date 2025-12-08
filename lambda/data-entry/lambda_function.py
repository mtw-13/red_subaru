import json
import boto3
from datetime import datetime
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])

def lambda_handler(event, context):
    """
    Receives POST request with sighting data and stores it in DynamoDB.
    Token validation is handled by API Gateway authorizer.
    """
    
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event['body']
        
        date = body.get('date')
        count = body.get('count')
        
        # Validation
        if not date or not count:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing date or count'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        if not isinstance(count, int) or count < 1:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Count must be a positive integer'}),
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        
        # Extract user from authorizer context
        user_email = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', 'unknown')
        
        # Create item with timestamp
        item = {
            'user_email': user_email,
            'date': date,
            'count': int(count),
            'timestamp': datetime.utcnow().isoformat(),
            'sort_key': f"{date}#{datetime.utcnow().timestamp()}"  # For uniqueness
        }
        
        # Write to DynamoDB
        table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Sighting recorded successfully',
                'data': item
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON in request body'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
