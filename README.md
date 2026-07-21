# SimuTeach

SimuTeach is an AI classroom simulator for K–12 STEM teachers. A teacher rehearses a lesson with five fictional students whose private, structured learning states evolve in response to specific teaching moments. The final Classroom X-Ray links every insight to real evidence from the rehearsal.

This is an OpenAI Build Week 2026 Education-track project.

## The magic loop

1. Choose the precomputed Newton’s Third Law lesson or upload PDF, PPTX, DOCX, or TXT material.
2. Meet five students with distinct backgrounds and participation styles.
3. Teach naturally with optional camera and live microphone transcription, or use the typed demo controls.
4. Watch controlled hand raises and hear at most one student respond at a time.
5. Correct Maya’s initial “the truck pushes harder” misconception.
6. Ask again and hear Maya use her updated simulated understanding.
7. Open the Classroom X-Ray to inspect mastery shifts and timestamp-linked evidence.

The default demo is deterministic unless `USE_OPENAI_DEMO=true`. This makes the three-minute judge path reliable even if a model or audio call is unavailable. Uploaded lessons use GPT-5.6 when configured and automatically fall back to bounded local behavior.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No API key is required for the complete typed demo. To enable OpenAI lesson analysis, uploaded-lesson orchestration, Realtime transcription, and generated speech, set `OPENAI_API_KEY` in `.env.local`.

```bash
npm run typecheck
npm test
npm run build
```

## OpenAI usage

- `gpt-5.6-terra`, low reasoning: lesson analysis and five-student roster generation.
- `gpt-5.6-luna`, no reasoning: one live orchestration decision per meaningful teacher turn.
- Realtime transcription over WebRTC: continuous browser microphone input through a short-lived client secret.
- `gpt-4o-mini-tts`: streamed, distinct student voices. `OPENAI_TTS_MODEL=tts-1` remains supported.
- Structured Outputs with Zod: model proposals are validated before deterministic code can commit them.

Model IDs are environment-configurable. The permanent API key never reaches the browser.

## Architecture

The implementation is a modular Next.js monolith with no database and no persistent student agents. Persistence lives in explicit `StudentCognitiveState` objects. A single orchestrator proposes bounded patches; a deterministic reducer rejects stale versions, unknown IDs, missing evidence, and out-of-range changes.

Active sessions live in one in-process TTL store. Camera frames remain local. Audio is never stored. Transcript events exist only in process memory until report generation, and the report lives only in browser memory. This is intentionally a single-process hackathon MVP, not a serverless production topology.

See [docs/architecture.md](docs/architecture.md), [docs/demo-script.md](docs/demo-script.md), and [docs/codex-collaboration.md](docs/codex-collaboration.md).

## Safety and educational integrity

- Students are fictional rehearsal hypotheses, not predictions about real children.
- Profiles avoid protected-trait or diagnosis-based inference.
- The UI never exposes cognitive state during the live rehearsal.
- Feedback discusses observed teaching events, not the teacher’s personal competence.
- Every report citation resolves to an existing event and deterministic timestamp.
- Users are told that voices are AI-generated.

## Codex collaboration

The majority of this repository was built in one Codex task on July 20, 2026. Codex translated the technical design into schemas, reducers, endpoints, UX, tests, and documentation, and verified current OpenAI API guidance. The human supplied the product concept and technical design and retained the key decisions: audience, magic moment, privacy posture, modular-monolith architecture, structured simulated state, and evidence-linked feedback.

Before submission, run `/feedback` in the primary Codex task and add the returned Session ID to [docs/codex-collaboration.md](docs/codex-collaboration.md).

## Hackathon testing

Judges can use the one-click Newton’s Third Law demo without credentials. The complete fallback path is free and requires no rebuilding beyond the standard npm setup. With an API key, live audio features are also enabled. See the demo script for the exact 90-second product path.
