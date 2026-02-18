import { NextResponse } from 'next/server';
import {
  createSession,
  listSessions,
  deleteSession,
  getSession,
  updateSession,
} from '@/lib/gemini-client';
import type { Session } from '@/types/gemini';

/** Prefix used to embed agent ID inside displayName. */
const AGENT_PREFIX_RE = /^\[agent:([^\]]+)\]\s*/;

/** Extract agentId from displayName and clean it up. */
function parseAgentFromDisplayName(session: Session): Session {
  if (session.displayName) {
    const match = session.displayName.match(AGENT_PREFIX_RE);
    if (match) {
      session.agentId = match[1];
      session.displayName = session.displayName.replace(AGENT_PREFIX_RE, '');
    }
  }
  return session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAnswerText(detailedAnswer: any): string {
  if (!detailedAnswer) return '';
  // Extract from replies (excluding thought entries)
  if (detailedAnswer.replies) {
    const texts: string[] = [];
    for (const reply of detailedAnswer.replies) {
      const content = reply?.groundedContent?.content;
      if (content?.text && !content?.thought) {
        texts.push(content.text);
      }
    }
    if (texts.length > 0) return texts.join('');
  }
  // Fallback to answerText
  return detailedAnswer.answerText || '';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionName = searchParams.get('name');

    if (sessionName) {
      // Fetch individual session with full answer details
      const session = await getSession(sessionName);

      if (session.turns) {
        // Extract answer text from detailedAssistAnswer provided by the API
        for (const turn of session.turns) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detailed = (turn as any).detailedAssistAnswer;
          if (detailed) {
            turn.answer = extractAnswerText(detailed);
          }
        }
      }

      return NextResponse.json(parseAgentFromDisplayName(session));
    }

    const sessions = await listSessions();
    return NextResponse.json({
      sessions: sessions.map(parseAgentFromDisplayName),
    });
  } catch (error) {
    console.error('Sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { displayName, userPseudoId } = await request.json();
    const session = await createSession(displayName, userPseudoId);
    return NextResponse.json(session);
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionName = searchParams.get('name');

    if (!sessionName) {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 },
      );
    }

    const { agentId } = await request.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 },
      );
    }

    // Fetch current session to get current displayName
    const current = await getSession(sessionName);
    let cleanName = current.displayName || '';
    // Remove existing agent prefix if any
    cleanName = cleanName.replace(AGENT_PREFIX_RE, '');
    const newDisplayName = `[agent:${agentId}] ${cleanName}`;

    const updated = await updateSession(sessionName, {
      displayName: newDisplayName,
    });

    return NextResponse.json(parseAgentFromDisplayName(updated));
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionName = searchParams.get('name');

    if (!sessionName) {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 },
      );
    }

    await deleteSession(sessionName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 },
    );
  }
}
