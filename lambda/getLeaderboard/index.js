/**
 * API Gateway Lambda - Get Leaderboard
 * Scans sightings, aggregates by user, returns top 10
 */

const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const SIGHTINGS_TABLE = process.env.SIGHTINGS_TABLE || 'RedSubaruSightings';

// CORS headers for API Gateway
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

exports.handler = async (event) => {
  console.log('Get Leaderboard Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Scan all sightings from the table
    // Using GSI1 to get all sightings efficiently
    const scanParams = {
      TableName: SIGHTINGS_TABLE,
      IndexName: 'GSI1',
      FilterExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: 'SIGHTING' },
      },
      ProjectionExpression: 'userId, #cnt',
      ExpressionAttributeNames: {
        '#cnt': 'count',
      },
    };

    let items = [];
    let lastEvaluatedKey = null;

    // Handle pagination for large datasets
    do {
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await client.send(new ScanCommand(scanParams));
      items = items.concat(response.Items || []);
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`Scanned ${items.length} sightings`);

    // Aggregate sightings by userId
    const userTotals = {};

    for (const item of items) {
      const userId = item.userId?.S;
      const count = parseInt(item.count?.N || '0', 10);

      if (userId) {
        userTotals[userId] = (userTotals[userId] || 0) + count;
      }
    }

    // Convert to array and sort by total count (descending)
    const leaderboard = Object.entries(userTotals)
      .map(([userId, totalCount]) => ({
        userId,
        totalCount,
      }))
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10); // Top 10

    // Add rank
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        leaderboard: rankedLeaderboard,
        totalUsers: Object.keys(userTotals).length,
        lastUpdated: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);

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
