# Contract: Astrophotography Chatbot API

**Feature**: 001-home-astro-hub  
**Interface**: Chat API for logged-in users

## Overview

POST endpoint accepts user message and conversation history; returns OpenAI streaming response. Auth required.

## Endpoint

- **POST** `/api/chat` (or `/api/home/chat`)

## Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messages | Array<{ role, content }> | Yes | Conversation history; last message is user input |
| (auth) | Session | Yes | Must be logged in |

**Zod schema** (example):

```ts
const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })),
});
```

## Response

- **Streaming**: `Content-Type: text/event-stream` (Server-Sent Events) or `Transfer-Encoding: chunked`
- **Format**: OpenAI stream chunks; client consumes delta content
- **Auth failure**: 401 Unauthorized
- **Rate limit / OpenAI error**: 503 with retry message

## System Prompt (Implementation)

Chatbot MUST be instructed to:
- Focus on astrophotography and astronomy
- Redirect off-topic or inappropriate requests
- Maintain helpful, educational tone
