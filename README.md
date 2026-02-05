# 🚗 Red Subaru Tracker

A full-stack serverless Single Page Application (SPA) to track "Red Subaru" sightings. Compete with friends to spot the most red Subarus!

## Features

- **Authentication**: Secure login/signup with AWS Cognito (or mock auth for local dev)
- **Sighting Logging**: Record date, count, location, and notes for each sighting
- **Leaderboard**: See who has spotted the most Red Subarus
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Amazon Cognito Identity JS** for authentication
- **Axios** for API calls

### Backend
- **AWS Lambda** (Node.js) for API endpoints
- **Amazon API Gateway** (REST API)
- **AWS Cognito** for authentication

### Database
- **Amazon RDS** (PostgreSQL) for data storage

### Infrastructure
- **Amazon S3** for static hosting
- **Amazon CloudFront** for CDN distribution

## Project Structure

```
red_subaru/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── Auth/           # Login, SignUp, AuthContainer
│   │   ├── Header/         # App header with user info
│   │   ├── Leaderboard/    # Leaderboard display
│   │   └── SightingForm/   # Form to log sightings
│   ├── context/            # React Context (AuthContext)
│   ├── pages/              # Page components (Dashboard)
│   ├── services/           # API and Auth services
│   ├── types.ts            # TypeScript type definitions
│   └── config.ts           # App configuration
├── lambda/                 # AWS Lambda functions
│   ├── postSighting/       # POST /sightings endpoint
│   ├── getSightings/       # GET /sightings endpoint
│   ├── getLeaderboard/     # GET /leaderboard endpoint
│   ├── cognitoPostConfirmation/  # Cognito trigger
│   ├── shared/             # Shared utilities (db, response)
│   └── local-server.js     # Local Express server for testing
├── database/               # Database schemas
│   ├── schema.sql          # PostgreSQL schema
│   └── seed.sql            # Test data
├── scripts/                # Utility scripts
│   └── migrate.js          # Database migration script
└── docker-compose.yml      # Local PostgreSQL setup
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)
- npm or yarn

### Local Development Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   cd lambda && npm install && cd ..
   ```

2. **Start the local database**
   ```bash
   npm run db:start
   ```
   This starts PostgreSQL with the schema and seed data.

3. **Start the backend API server**
   ```bash
   cd lambda
   npm run local
   ```
   The API will be available at http://localhost:4000

4. **Start the frontend development server**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000

### Local Testing

For local development, the app uses **mock authentication** by default. You can sign in with any email/password combination. The mock user is synced with the test data in the database.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=red_subaru
DB_USER=postgres
DB_PASSWORD=postgres

# Frontend
VITE_USE_MOCK_AUTH=true  # Set to 'false' for real Cognito

# Cognito (for production)
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/sightings` | Create a new sighting | Required |
| GET | `/api/sightings` | Get user's sightings | Required |
| GET | `/api/leaderboard` | Get leaderboard | Public |
| GET | `/api/health` | Health check | Public |

### POST /sightings

```json
{
  "sightingDate": "2024-01-15",
  "count": 3,
  "location": "Main Street",
  "notes": "Spotted near downtown"
}
```

### GET /leaderboard

Query params: `limit` (default: 10, max: 100)

Response:
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid",
      "username": "Alice",
      "totalSightings": 15,
      "sightingEntries": 5,
      "lastSightingDate": "2024-01-20"
    }
  ],
  "total": 1
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Sightings Table
```sql
CREATE TABLE sightings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    sighting_date DATE NOT NULL,
    count INTEGER NOT NULL,
    notes TEXT,
    location VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## AWS Deployment

### 1. Create Cognito User Pool

1. Go to AWS Cognito Console
2. Create a User Pool with email sign-up
3. Create an App Client (no secret)
4. Note the User Pool ID and Client ID
5. Add Lambda trigger for Post-Confirmation (use `cognitoPostConfirmation` function)

### 2. Create RDS Database

1. Create PostgreSQL RDS instance
2. Configure security groups for Lambda access
3. Run `database/schema.sql` to create tables

### 3. Deploy Lambda Functions

Each function in the `lambda/` directory should be:
1. Zipped with dependencies (`npm install` + zip contents)
2. Uploaded to AWS Lambda
3. Connected to API Gateway
4. Configured with environment variables for RDS connection

### 4. Configure API Gateway

1. Create REST API
2. Create resources and methods:
   - `POST /sightings` → postSighting Lambda
   - `GET /sightings` → getSightings Lambda
   - `GET /leaderboard` → getLeaderboard Lambda
3. Configure Cognito Authorizer for protected endpoints
4. Enable CORS
5. Deploy to a stage

### 5. Deploy Frontend

1. Build: `npm run build`
2. Upload `dist/` to S3
3. Configure CloudFront distribution
4. Update environment variables for production URLs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run db:start` | Start local PostgreSQL |
| `npm run db:stop` | Stop local PostgreSQL |
| `npm run db:migrate` | Run database migrations |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own Red Subaru tracking needs! 🚗
