# Codex collaboration log

This project was implemented during OpenAI Build Week on July 20, 2026. This log distinguishes human product decisions from Codex-assisted implementation.

## Primary task

- Date: July 20, 2026
- Codex `/feedback` Session ID: **TODO — run `/feedback` in the primary build task before submission**
- Starting point: empty Git repository plus a human-authored technical design document and the official hackathon rules.

## Human decisions

The project author supplied and retained these central decisions:

- K–12 STEM teachers are the audience.
- The product is a lesson rehearsal, not a student-prediction or grading tool.
- The magic moment is one student starting with a misconception, changing after a specific explanation, then answering differently later.
- Student persistence is explicit structured state, not five opaque persistent agents.
- Model-proposed changes are bounded and validated by deterministic application code.
- Reports cite real session events and never imply that audio/video is replayable.
- The hackathon build prioritizes a polished deterministic demo over production infrastructure.

## Codex contributions

Codex:

- read the full technical design and relevant hackathon requirements;
- checked current official OpenAI model, Realtime transcription, WebRTC, TTS, and Structured Outputs documentation;
- scaffolded the Next.js/TypeScript application from an empty repository;
- implemented Zod schemas, the state reducer, event store, deterministic evaluator path, file ingestion, OpenAI integration, API routes, and ephemeral deletion behavior;
- designed and implemented the prepare, roster, live-classroom, and Classroom X-Ray interfaces;
- created prompt/schema eval fixtures for the Newton’s Third Law magic loop;
- added setup, architecture, testing, privacy, and demo documentation;
- ran type checking, unit tests, production build verification, and browser QA.

## Important implementation judgments made during collaboration

- The default demo remains deterministic unless `USE_OPENAI_DEMO=true`; this protects the judge path while keeping full GPT-5.6 orchestration available.
- The current recommended `gpt-4o-mini-tts` is the default speech model, while `tts-1` remains configurable to match the original design.
- Realtime microphone access is optional and the typed demo path exercises the exact same session API.
- The UI uses original CSS/shape-based fictional avatars, avoiding external trademarks or unlicensed assets.
- The X-Ray is deterministically assembled from committed states and events so evidence correctness does not depend on a report model call.

## Verification record

Record the final commit hash and results here before submission:

```text
npm run typecheck  # passed July 20, 2026
npm test           # passed: 7 tests
npm run build      # passed: Next.js 16.2.10 production build
npm install        # audited: 0 known vulnerabilities
```

This log should remain factual. Add the final Codex Session ID and commit hash; do not claim product behavior that was not demonstrated.
