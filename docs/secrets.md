# Secrets

Never commit real API keys.

Use a local `.env` file based on `.env.example`:

```text
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=your-local-key
```

If a key is pasted into chat, screenshots, logs, or commits, rotate it in the provider dashboard before using it in production.

