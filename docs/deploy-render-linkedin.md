# Deploy MyAgent API For LinkedIn OAuth

LinkedIn OAuth needs a public HTTPS callback URL. Render can host the FastAPI backend and give you a stable URL like:

```text
https://myagent-api.onrender.com
```

## 1. Push Project To GitHub

Do not commit `.env`. It is already ignored.

## 2. Create Render Service

1. Go to `https://render.com`
2. New -> Blueprint
3. Select this repository
4. Render will read `render.yaml`
5. Create the `myagent-api` service

## 3. Add Environment Variables In Render

Set these in Render -> `myagent-api` -> Environment:

```text
JWT_SECRET=your jwt secret
AI_PROVIDER=litellm
AI_MODEL=anthropic/claude-haiku-4-5
LITELLM_API_BASE=https://litellm.i-hq.tech/v1
LITELLM_API_KEY=your LiteLLM key
LINKEDIN_CLIENT_ID=your linkedin client id
LINKEDIN_CLIENT_SECRET=your linkedin client secret
LINKEDIN_REDIRECT_URI=https://YOUR-RENDER-URL/api/connectors/linkedin/callback
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000"]
```

If you also want Google/GitHub OAuth on deployed backend, add their deployed redirect URLs too.

## 4. Add Redirect URL In LinkedIn

LinkedIn Developer App -> Auth -> Authorized redirect URLs:

```text
https://YOUR-RENDER-URL/api/connectors/linkedin/callback
```

## 5. Point Local Frontend To Deployed API

In local `.env`, change:

```text
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-URL/api
```

Restart:

```powershell
npm start
```

Now Connectors -> Connect LinkedIn will use the deployed backend and the local frontend will read the same deployed profile data.
