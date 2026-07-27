# Database Schema

Main tables:

- `users`
- `user_profiles`
- `agents`
- `connector_accounts`
- `memory_items`
- `events`
- `situations`
- `recommendations`
- `actions`
- `notifications`
- `agent_runs`

The first version uses SQLAlchemy models in `apps/api/app/db/models.py`. Alembic migrations should be generated from these models before production deployment.

## Important Relationships

```text
users -> user_profiles
users -> connector_accounts
users -> memory_items
users -> events
events -> situations
situations -> recommendations
recommendations -> actions
users -> notifications
```

