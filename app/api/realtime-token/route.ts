import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Add OPENAI_API_KEY to enable live transcription." }, { status: 503 });
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "classroom-lens-demo-user",
    },
    body: JSON.stringify({
      session: {
        type: "transcription",
        audio: {
          input: {
            transcription: { model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-transcribe", language: "en" },
            turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 550 },
            noise_reduction: { type: "near_field" },
          },
        },
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: "Could not create a Realtime transcription session.", details: data?.error?.message }, { status: response.status });
  return NextResponse.json(data);
}
