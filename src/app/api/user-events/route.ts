import { NextRequest, NextResponse } from 'next/server';
import { writeUserEvent } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataStoreId, event } = body;

    if (!dataStoreId || !event) {
      return NextResponse.json(
        { error: 'dataStoreId and event are required' },
        { status: 400 },
      );
    }

    if (!event.eventType || !event.userPseudoId) {
      return NextResponse.json(
        { error: 'event.eventType and event.userPseudoId are required' },
        { status: 400 },
      );
    }

    const result = await writeUserEvent(dataStoreId, event);
    return NextResponse.json(result);
  } catch (error) {
    console.error('User event error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write user event' },
      { status: 500 },
    );
  }
}
