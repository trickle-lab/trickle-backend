# Contributing to Trickle Backend

## Setup
npm install
cp .env.example .env
(fill in your own values in .env)
npm run dev

## Verifying changes
npx tsc --noEmit
curl http://localhost:4000/health
curl http://localhost:4000/events

## Pull Requests
- Branch from main
- Run npx tsc --noEmit before pushing, CI will reject type errors
- Describe what you tested manually, since automated tests aren't set up yet