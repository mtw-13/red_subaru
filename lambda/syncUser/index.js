/**
 * Cognito Post-Confirmation Trigger
 * Syncs new user data to DynamoDB when they confirm their account
 */

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const TABLE_NAME = process.env.USERS_TABLE || 'RedSubaruUsers';

exports.handler = async (event) => {
  console.log('Cognito Post-Confirmation Event:', JSON.stringify(event, null, 2));

  // Only process confirmed sign-ups
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    console.log('Skipping non-signup confirmation trigger:', event.triggerSource);
    return event;
  }

  const { sub, email, nickname } = event.request.userAttributes;

  if (!sub || !email) {
    console.error('Missing required attributes: sub or email');
    return event;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: {
      userId: { S: sub },
      email: { S: email },
      nickname: { S: nickname || email.split('@')[0] },
      createdAt: { S: new Date().toISOString() },
      totalSightings: { N: '0' },
    },
    ConditionExpression: 'attribute_not_exists(userId)',
  };

  try {
    await client.send(new PutItemCommand(params));
    console.log(`User ${sub} synced to DynamoDB successfully`);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log(`User ${sub} already exists in DynamoDB`);
    } else {
      console.error('Error saving user to DynamoDB:', error);
      throw error;
    }
  }

  // Must return the event object for Cognito triggers
  return event;
};
