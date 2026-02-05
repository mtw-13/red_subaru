/**
 * API Gateway Lambda - Record a Red Subaru Sighting
 * Accepts userId, date, and count; saves to DynamoDB
 */

const { DynamoDBClient, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const SIGHTINGS_TABLE = process.env.SIGHTINGS_TABLE || 'RedSubaruSightings';
const USERS_TABLE = process.env.USERS_TABLE || 'RedSubaruUsers';

// CORS headers for API Gateway
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

exports.handler = async (event) => {
  console.log('Record Sighting Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { userId, date, count } = body;

    // Validate required fields
    if (!userId || !date || count === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: userId, date, and count are required',
        }),
      };
    }

    // Validate count is a positive integer
    const sightingCount = parseInt(count, 10);
    if (isNaN(sightingCount) || sightingCount < 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Count must be a positive integer',
        }),
      };
    }

    // Generate unique sighting ID
    const sightingId = randomUUID();
    const timestamp = new Date().toISOString();

    // Save sighting to DynamoDB
    const putParams = {
      TableName: SIGHTINGS_TABLE,
      Item: {
        PK: { S: `USER#${userId}` },
        SK: { S: `SIGHTING#${sightingId}` },
        GSI1PK: { S: 'SIGHTING' },
        GSI1SK: { S: `${date}#${sightingId}` },
        sightingId: { S: sightingId },
        userId: { S: userId },
        date: { S: date },
        count: { N: sightingCount.toString() },
        createdAt: { S: timestamp },
      },
    };

    await client.send(new PutItemCommand(putParams));
    console.log(`Sighting ${sightingId} saved successfully`);

    // Update user's total sightings count
    const updateParams = {
      TableName: USERS_TABLE,
      Key: {
        userId: { S: userId },
      },
      UpdateExpression: 'ADD totalSightings :count',
      ExpressionAttributeValues: {
        ':count': { N: sightingCount.toString() },
      },
    };

    try {
      await client.send(new UpdateItemCommand(updateParams));
      console.log(`User ${userId} total sightings updated`);
    } catch (updateError) {
      console.warn('Could not update user total (user may not exist):', updateError.message);
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Sighting recorded successfully',
        sighting: {
          sightingId,
          userId,
          date,
          count: sightingCount,
          createdAt: timestamp,
        },
      }),
    };
  } catch (error) {
    console.error('Error recording sighting:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
