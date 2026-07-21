# Architecture

## System shape

Classroom Lens is one TypeScript repository and one long-running Next.js process.

```text
Browser
  ├─ prepare / meet / live / X-Ray views
  ├─ local-only camera preview
  └─ microphone → OpenAI Realtime transcription over WebRTC

Next.js server
  ├─ lesson extraction and GPT-5.6 Terra analysis
  ├─ in-memory session/event store with TTL
  ├─ GPT-5.6 Luna classroom orchestrator
  ├─ deterministic patch reducer and turn controller
  ├─ OpenAI Speech API stream
  └─ deterministic evidence-linked X-Ray
```

There are no five persistent agents. Each simulated student is a visible profile plus a private, structured cognitive state. For each meaningful teacher event, one orchestration call receives the lesson, all current student states, and a compact recent-event window.

## Core trust boundary

The model proposes; application code decides.

1. A completed teacher utterance is appended to the event stream.
2. The meaningful-event gate drops filler and management speech.
3. The orchestrator classifies the teacher act and proposes state patches, hands, and zero or one speaker.
4. The reducer rejects stale versions, unknown IDs, missing evidence, and invalid deltas.
5. Valid patches increment one state version and emit a state-transition event.
6. The turn controller ensures one speaker and ignores invalid student IDs.
7. The X-Ray derives changes from committed states and cites only stored event IDs.

## API routes

| Route | Purpose |
|---|---|
| `GET /api/demo/newtons-third-law` | Create deterministic demo session |
| `POST /api/lessons/analyze` | Extract and model uploaded material |
| `POST /api/classrooms/generate` | Generate/adapt five students |
| `GET/DELETE /api/sessions/:id` | Read public session or purge it |
| `POST /api/sessions/:id/start` | Start versioned event clock |
| `POST /api/sessions/:id/utterances` | Gate, orchestrate, validate, commit |
| `POST /api/sessions/:id/speech` | Stream selected student speech |
| `POST /api/sessions/:id/end` | Freeze and return Classroom X-Ray |
| `POST /api/realtime-token` | Create short-lived Realtime credentials |

## Production boundary

The in-memory store deliberately requires a single process. A production continuation should add an encrypted event store, authentication/consent, background report jobs, multi-instance coordination, formal under-18/privacy review, rate limiting, moderation, observability, and accessibility testing. None of those concerns should be represented as complete in this MVP.
