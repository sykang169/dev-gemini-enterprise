import { NextResponse } from 'next/server';
import { inspectText } from '@/lib/dlp-client';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'text field is required' },
        { status: 400 },
      );
    }

    const result = await inspectText(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error('DLP inspection error:', error);
    return NextResponse.json(
      { error: 'DLP inspection failed' },
      { status: 500 },
    );
  }
}
