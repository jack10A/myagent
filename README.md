# MyAgent

MyAgent is a proactive AI chief-of-staff SaaS platform with a built-in Guardian safety layer.

The MVP focuses on:

- Adaptive onboarding that creates a structured user context profile.
- Connectors for Gmail, Google Calendar, and weather/emergency alert sources.
- Long-term memory for goals, projects, preferences, events, and decisions.
- Multi-agent orchestration that turns scattered signals into one recommendation.
- Guardian review before notifications or external actions.
- Approval-first action workflow.

## Monorepo

```text
apps/
  api/        FastAPI backend
  web/        Next.js frontend
packages/
  prompts/   Agent and Guardian prompt templates
  shared-types/
docs/         Architecture and product notes
infra/        Docker and deployment files
```

## Quick Start

Copy `.env.example` to `.env`, then run with Docker:

```bash
docker compose up --build
```

For local development on Windows, start the API, web app, and browser automatically:

```powershell
npm start
```

Or:

```powershell
npm run start:local
```

The interview popup saves profile answers to:

- Browser local storage for instant UI updates.
- `apps/api/data/demo_profile.json` through the backend when it is running.

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## MVP Demo Scenario

1. User completes onboarding.
2. User connects calendar/email/weather sources.
3. A new situation is created, such as a meeting conflict or nearby storm.
4. MyAgent routes the situation through specialist agents.
5. The Guardian checks risk, privacy, relevance, and approval requirements.
6. User receives one actionable recommendation.
