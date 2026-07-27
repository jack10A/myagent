# Weather And Emergency Alerts

MyAgent uses a provider setting:

```text
EMERGENCY_ALERTS_PROVIDER=nws
```

## Free US Weather Alerts

For US locations, use the National Weather Service API. It does not require a key.

Required environment values:

```text
DEFAULT_ALERT_CITY=New York
DEFAULT_ALERT_LAT=40.7128
DEFAULT_ALERT_LON=-74.0060
```

API route:

```text
GET /api/alerts/nearby?lat=40.7128&lon=-74.0060&city=New%20York
```

## Demo Emergency Alerts

For hackathon demos, traffic accidents, or non-US cities:

```text
EMERGENCY_ALERTS_PROVIDER=mock
```

Mock mode returns weather and accident-style alerts without external services.

## Future Upgrade

- Convert onboarding city to coordinates.
- Ask browser location permission as opt-in.
- Check weather alerts near the user.
- Compare alerts against calendar event routes.
- Create Guardian recommendations such as leave earlier, draft delay email, or reschedule.

## Live Location MVP

The frontend map uses browser geolocation only after the user clicks `Use live location`.

Flow:

```text
User clicks Use live location
Browser asks permission
Frontend receives latitude/longitude
Frontend calls /api/alerts/nearby
Guardian Map displays current location and alert markers
```

Live location is not stored yet. It is used in the browser for the current session.
