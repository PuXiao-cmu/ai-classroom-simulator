import { NextResponse } from "next/server";
import { deleteSession, getSession, publicSession } from "@/lib/session-store";

type Context = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) return NextResponse.json({ error: "This rehearsal expired or was deleted." }, { status: 404 });
  return NextResponse.json({ session: publicSession(session), apiConfigured: Boolean(process.env.OPENAI_API_KEY) });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { sessionId } = await params;
  deleteSession(sessionId);
  return new Response(null, { status: 204 });
}
