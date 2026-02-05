# Red Subaru Tracker - Development Instructions

## Project Overview

A full-stack serverless SPA for tracking Red Subaru sightings with React frontend and AWS Lambda backend.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Authentication**: AWS Cognito (amazon-cognito-identity-js)
- **Backend**: AWS Lambda (Node.js) + API Gateway
- **Database**: PostgreSQL (Amazon RDS)
- **Hosting**: S3 + CloudFront

## Project Structure

```
src/                    # React frontend
├── components/         # Auth, Header, SightingForm, Leaderboard
├── context/            # AuthContext for auth state
├── pages/              # Dashboard page
├── services/           # API and Auth services
└── config.ts           # Environment configuration

lambda/                 # Lambda functions
├── postSighting/       # POST /sightings
├── getSightings/       # GET /sightings
├── getLeaderboard/     # GET /leaderboard
├── cognitoPostConfirmation/  # Cognito trigger
└── shared/             # DB and response utilities

database/               # SQL schema and seed data
```

## Local Development

1. Start PostgreSQL: `npm run db:start`
2. Start API server: `cd lambda && npm run local`
3. Start frontend: `npm run dev`

Mock authentication is enabled by default for local development.

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend (port 3000) |
| `npm run build` | Build for production |
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL container |
| `cd lambda && npm run local` | Start local API (port 4000) |

## Environment Variables

Configure in `.env`:
- `VITE_USE_MOCK_AUTH=true` for local dev
- `VITE_COGNITO_*` for production Cognito settings
- `DB_*` for database connection

## Development Guidelines

- Use TypeScript for all frontend code
- Follow React hooks patterns
- Use the AuthContext for authentication state
- API calls go through the apiService
- Test locally with mock auth before deploying

