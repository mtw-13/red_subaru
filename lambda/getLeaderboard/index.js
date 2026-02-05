/**
 * API Gateway Lambda - Get Leaderboard
 * Scans sightings, aggregates by user, returns top 10 and period winners
 */

const { DynamoDBClient, ScanCommand, BatchGetItemCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const SIGHTINGS_TABLE = process.env.SIGHTINGS_TABLE || 'RedSubaruSightings';
const USERS_TABLE = process.env.USERS_TABLE || 'RedSubaruUsers';

// CORS headers for API Gateway
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

// Helper to get date boundaries
function getDateBoundaries() {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMonth = today.slice(0, 7); // YYYY-MM
  const currentYear = today.slice(0, 4); // YYYY
  return { today, currentMonth, currentYear };
}

exports.handler = async (event) => {
  console.log('Get Leaderboard Event:', JSON.stringify(event, null, 2));

  // Get HTTP method (support both v1 and v2 API Gateway formats)
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;

  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { today, currentMonth, currentYear } = getDateBoundaries();

    // Scan all sightings from the table
    const scanParams = {
      TableName: SIGHTINGS_TABLE,
      IndexName: 'GSI1',
      FilterExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: 'SIGHTING' },
      },
      ProjectionExpression: 'userId, #cnt, #dt',
      ExpressionAttributeNames: {
        '#cnt': 'count',
        '#dt': 'date',
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

    // Aggregate sightings by userId for different time periods
    const userTotals = {};
    const dailyTotals = {};
    const monthlyTotals = {};
    const yearlyTotals = {};

    for (const item of items) {
      const userId = item.userId?.S;
      const count = parseInt(item.count?.N || '0', 10);
      const date = item.date?.S || '';

      if (userId) {
        // All-time totals
        userTotals[userId] = (userTotals[userId] || 0) + count;

        // Daily totals (today only)
        if (date === today) {
          dailyTotals[userId] = (dailyTotals[userId] || 0) + count;
        }

        // Monthly totals (current month)
        if (date.startsWith(currentMonth)) {
          monthlyTotals[userId] = (monthlyTotals[userId] || 0) + count;
        }

        // Yearly totals (current year)
        if (date.startsWith(currentYear)) {
          yearlyTotals[userId] = (yearlyTotals[userId] || 0) + count;
        }
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

    // Fetch nicknames for top users from users table
    const userIds = leaderboard.map(entry => entry.userId);
    let userNicknames = {};

    console.log('USERS_TABLE:', USERS_TABLE);
    console.log('User IDs to fetch:', userIds);

    if (userIds.length > 0) {
      try {
        const batchGetParams = {
          RequestItems: {
            [USERS_TABLE]: {
              Keys: userIds.map(userId => ({ userId: { S: userId } })),
              ProjectionExpression: 'userId, nickname, email',
            },
          },
        };

        console.log('BatchGet params:', JSON.stringify(batchGetParams, null, 2));

        const batchResponse = await client.send(new BatchGetItemCommand(batchGetParams));
        console.log('BatchGet response:', JSON.stringify(batchResponse, null, 2));
        
        const users = batchResponse.Responses?.[USERS_TABLE] || [];

        for (const user of users) {
          const id = user.userId?.S;
          const nickname = user.nickname?.S || user.email?.S?.split('@')[0] || 'Anonymous';
          console.log(`User ${id} -> nickname: ${nickname}`);
          if (id) {
            userNicknames[id] = nickname;
          }
        }
      } catch (err) {
        console.error('Could not fetch user nicknames:', err.message, err.stack);
      }
    }

    console.log('Final userNicknames map:', userNicknames);

    // Add rank and nickname
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      nickname: userNicknames[entry.userId] || `User-${entry.userId.slice(0, 6)}`,
      totalCount: entry.totalCount,
    }));

    // Helper to get top winner from totals
    const getWinner = (totals) => {
      const entries = Object.entries(totals);
      if (entries.length === 0) return null;
      const [userId, count] = entries.sort((a, b) => b[1] - a[1])[0];
      return {
        userId,
        nickname: userNicknames[userId] || `User-${userId.slice(0, 6)}`,
        count,
      };
    };

    const winners = {
      daily: getWinner(dailyTotals),
      monthly: getWinner(monthlyTotals),
      yearly: getWinner(yearlyTotals),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        leaderboard: rankedLeaderboard,
        winners,
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
