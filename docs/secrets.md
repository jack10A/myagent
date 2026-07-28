# Secrets

Never commit real API keys.

Use a local `.env` file based on `.env.example`:

```text
AI_PROVIDER=litellm
AI_MODEL=anthropic/claude-haiku-4-5
LITELLM_API_BASE=https://litellm.i-hq.tech/v1
LITELLM_API_KEY=your-local-key
```

If a key is pasted into chat, screenshots, logs, or commits, rotate it in the provider dashboard before using it in production.
