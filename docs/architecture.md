# MyAgent Architecture

## Product Shape

MyAgent is a proactive AI chief-of-staff. It connects to a user's work and safety context, remembers what matters, and turns scattered signals into approved actions.

The Guardian is not a separate app. It is the safety layer that reviews every recommendation and action.

## MVP Boundaries

Included:

- Email/password auth.
- Adaptive onboarding.
- User context profile.
- Mock connector framework for Gmail, Google Calendar, weather, and emergency alerts.
- Memory CRUD.
- Event ingestion.
- Situation detection.
- Recommendation creation.
- Guardian risk review.
- Approval/rejection endpoints.
- SaaS dashboard pages.

Deferred:

- Real Google OAuth.
- Real Gmail and Calendar sync.
- Live location.
- Payment and billing.
- Organization/workspace support.
- Full vector search implementation.

## Core Flow

```text
Connector Event
-> Event table
-> Situation detector
-> Context Agent
-> Specialist Agent
-> Memory Agent
-> Growth Agent
-> Planning Agent
-> Action Agent
-> Guardian review
-> Action proposals
-> Notification
-> User approval
```

Agents pass structured messages to each other. Later agents depend on earlier outputs, and Guardian receives the full trace before any user-facing recommendation or action.

## Core Domain Concepts

### Event

Raw normalized information from a connector.

Examples:

- `email_received`
- `calendar_event_changed`
- `weather_alert`
- `traffic_accident`
- `emergency_alert`

### Situation

A meaningful change detected from one or more events.

Examples:

- Meeting conflict.
- Nearby accident may affect route.
- Severe weather may disrupt travel.
- Important email needs follow-up.

### Recommendation

One clear user-facing suggestion produced from a situation.

### Action

A proposed operation, such as draft email, update calendar, notify user, or suggest new time.

### Guardian Review

Safety decision before an action is displayed or executed.

## Agents

Initial internal agents:

- Context Agent: understands onboarding profile.
- Email Agent: analyzes email events.
- Calendar Agent: checks timing, conflicts, and travel windows.
- Memory Agent: retrieves relevant long-term context.
- Planning Agent: creates the best next step.
- Action Agent: formats executable or draftable actions.
- Guardian Agent: reviews risk and approval rules.
- Growth Agent: understands whether the user is a student or professional, tracks field research, recommends jobs, and builds a skill improvement plan.

## Growth Agent

The Growth Agent uses onboarding profile fields such as life stage, current role, target role, industry, skills, and skill gaps.

MVP outputs:

- Latest study watchlist for the user's field.
- Job recommendations based on current profile and target role.
- Skill improvement plan.
- Portfolio/project recommendations.

Future connectors:

- Web search for current studies and industry reports.
- Job boards.
- LinkedIn profile import.
- CV/resume upload and parsing.
- GitHub portfolio analysis.

Current CV analyzer:

- Accepts PDF or text upload.
- Extracts text in memory.
- Detects skills and standard CV sections.
- Returns strengths, role guess, and improvement recommendations.
- Does not store the uploaded file in the MVP.

## Memory Model

Memory uses structured rows first and vector search later.

Categories:

- Profile.
- Goal.
- Project.
- Preference.
- Contact.
- Event.
- Decision.

## Guardian Risk Levels

```text
low      Read-only insight or safety alert.
medium   External draft or proposed modification.
high     Sensitive communication or significant user impact.
blocked  Destructive or unsupported action.
```

## Nearby Emergency Alerts

MVP starts with city-level monitoring.

Implemented providers:

- `nws`: free US National Weather Service active alerts by latitude/longitude.
- `mock`: demo alerts for weather, accidents, and nearby emergency scenarios.

Later:

- Live location as opt-in.
- Route-aware alerts.
- Official traffic and emergency provider integration.
- Google Maps traffic incidents.
- Severe weather providers.
