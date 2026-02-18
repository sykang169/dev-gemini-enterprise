import { NextRequest, NextResponse } from 'next/server';
import { recommend } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataStoreId, eventType, userPseudoId, documentIds, pageSize } = body;

    if (!dataStoreId || !eventType || !userPseudoId) {
      return NextResponse.json(
        { error: 'dataStoreId, eventType, and userPseudoId are required' },
        { status: 400 },
      );
    }

    const result = await recommend(dataStoreId, {
      userEvent: {
        eventType,
        userPseudoId,
        ...(documentIds?.length && {
          documents: documentIds.map((id: string) => ({ id })),
        }),
      },
      ...(pageSize && { pageSize }),
    });

    return NextResponse.json({
      results: result.results || [],
      attributionToken: result.attributionToken,
      missingIds: result.missingIds,
    });
  } catch (error) {
    console.error('Recommend error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recommendation failed' },
      { status: 500 },
    );
  }
}
