import { NextRequest, NextResponse } from 'next/server';
import { completeQuery } from '@/lib/gemini-client';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query');
  const dataStoreId = searchParams.get('dataStoreId');

  if (!query || !dataStoreId) {
    return NextResponse.json(
      { error: 'query and dataStoreId are required' },
      { status: 400 },
    );
  }

  try {
    const result = await completeQuery(dataStoreId, query);
    return NextResponse.json({
      suggestions: result.querySuggestions || [],
      tailMatchTriggered: result.tailMatchTriggered,
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Autocomplete failed' },
      { status: 500 },
    );
  }
}
