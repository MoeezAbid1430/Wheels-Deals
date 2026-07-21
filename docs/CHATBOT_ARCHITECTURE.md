# Wheels&Deals Chatbot Architecture

## Recommended production stack

- **Chat service**: Node.js + TypeScript
- **LLM runtime**: OpenAI Responses API
- **Primary model**: `gpt-5` or `gpt-5-mini`
- **Embeddings**: `text-embedding-3-large`
- **Live marketplace data**: tool calling into the existing backend
- **Knowledge retrieval**: pgvector-backed RAG later, starter local retrieval now
- **Search**: existing backend search seam, with Meilisearch or OpenSearch behind it
- **Transport**: SSE streaming
- **Memory**: conversation summaries and user preferences stored in Postgres later

## Why hybrid instead of "training on live data"

Use:

- **tool calling** for live data
- **RAG** for rules, policies, and guides
- **conversation memory** for user context

Avoid:

- fine-tuning first
- trying to "train" on constantly changing auction rows
- letting the model guess live marketplace state

## First live tools

- `search_listings`
- `get_listing_details`
- `get_live_auction_status`
- `get_user_garage`
- `find_services_nearby`
- `compare_vehicles`
- `get_auction_rules`
- `get_recommendations`

## Near-term next steps

1. Add pgvector retrieval tables and indexing worker.
2. Add React chat widget.
3. Add persistent conversations and summaries.
4. Add safe write-actions behind confirmations:
   - save to wishlist
   - book inspection
   - message seller
   - add accessory to cart

## Reliability patterns now implemented

- Classify the user intent before asking the model to answer.
- Prefer live tools for live marketplace facts.
- Sanitize tool outputs before they are sent to the model.
- Add final response checks for sensitive data and unsupported live-data claims.
- Log only privacy-aware event metadata by default.
- Capture feedback so weak understanding and failed answers can become eval cases.
- Keep a starter eval set for auction grounding, privacy, service routing, garage fitment, and marketplace search.
