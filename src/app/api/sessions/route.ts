import { NextResponse } from 'next/server';
import {
  createSession,
  listSessions,
  deleteSession,
  getSession,
} from '@/lib/gemini-client';

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

      return NextResponse.json(session);
    }

    const sessions = await listSessions();
    return NextResponse.json({ sessions });
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
