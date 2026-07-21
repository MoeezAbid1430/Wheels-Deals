# Wheels&Deals Chatbot

This package is the starting point for the platform assistant stack.

## Architecture

The chatbot is intentionally built as a separate service so it can evolve without tangling the main marketplace backend.

- **Model runtime**: OpenAI Responses API
- **Live marketplace data**: tool calling into the main backend
- **Knowledge answers**: retrieval layer with a local starter corpus now, pgvector later
- **Search handoff**: main backend search and recommendation endpoints stay the source of truth
- **Streaming**: Server-Sent Events (SSE)

## Why this shape

For this product, "live data" should mostly come from tools, not from RAG:

- auctions
- bids
- listing prices
- garage state
- services nearby
- recommendations

RAG is for:

- auction rules
- KYC and privacy guidance
- platform help
- policy explanations

## Endpoints

- `GET /health`
- `GET /capabilities`
- `POST /chat`
- `POST /feedback`

`POST /chat` supports normal JSON responses and SSE streaming when:

- request body includes `"stream": true`, or
- request header `Accept: text/event-stream` is present

## Request shape

```json
{
  "conversationId": "optional-thread-id",
  "stream": true,
  "messages": [
    { "role": "user", "content": "Find me Honda Civics under 55 lacs in Lahore." }
  ],
  "userContext": {
    "userId": "user_123",
    "city": "Lahore",
    "viewingListingId": "listing_123"
  }
}
```

Pass the marketplace auth token in the `Authorization: Bearer ...` header when you want the chatbot to access private user tools like Garage-aware help.

## Run

From the project root:

```bash
npm install --prefix chatbot
npm run chatbot:dev
```

## Next implementation steps

1. Replace local starter retrieval with pgvector-backed indexed documents.
2. Add chat UI in the frontend.
3. Add user and conversation persistence in Postgres.
4. Add action tools like save to wishlist, book inspection, or start checkout behind confirmations.

## Reliability layer

The first reliability pass includes:

- intent routing for auction, marketplace, garage, services, policy, and comparison requests
- timeout and retry handling for live backend tool calls
- model-facing tool-result sanitization
- final answer checks for live-data grounding and sensitive data leakage
- privacy-aware event logs for continuous improvement
- user feedback endpoint
- starter evaluation cases in `src/evals`
