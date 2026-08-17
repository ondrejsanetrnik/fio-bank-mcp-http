# fio-bank-mcp-http

HTTP wrapper around [zjor/fio-bank-mcp](https://github.com/zjor/fio-bank-mcp) for Railway and Cursor (Streamable HTTP).

The upstream server only speaks local stdio. This repo adds a public `/mcp` endpoint with Bearer auth so Cursor can call FIO Bank over HTTPS.

## Env

- `FIO_API_TOKEN` — FIO internet banking API token (Settings → API)
- `MCP_AUTH_TOKEN` — Bearer token required by clients
- `PORT` — listen port (Railway sets this)

## Endpoints

- `GET /health` — healthcheck
- `POST /mcp` — MCP Streamable HTTP (auth required)

## Cursor

```json
{
  "mcpServers": {
    "fio-bank": {
      "url": "https://YOUR-APP.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

## FIO token

1. Log in to FIO internet banking
2. Settings → API → create a token (SMS / push)
3. Wait 5 minutes before first use
4. Data older than 90 days needs a temporary unlock in the same screen

Rate limit: 1 request per 30 seconds per token.
