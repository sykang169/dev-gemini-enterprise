import { NextRequest, NextResponse } from 'next/server';
import {
  listDocuments,
  createDocument,
  deleteDocument,
  importDocuments,
  purgeDocuments,
} from '@/lib/gemini-client';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dataStoreId = searchParams.get('dataStoreId');
  const pageSize = searchParams.get('pageSize');
  const pageToken = searchParams.get('pageToken');

  if (!dataStoreId) {
    return NextResponse.json({ error: 'dataStoreId is required' }, { status: 400 });
  }

  try {
    const result = await listDocuments(
      dataStoreId,
      undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
      pageToken || undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list documents' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  try {
    const body = await request.json();
    const { dataStoreId } = body;

    if (!dataStoreId) {
      return NextResponse.json({ error: 'dataStoreId is required' }, { status: 400 });
    }

    if (action === 'import') {
      const { bigquerySource, gcsSource, reconciliationMode, autoGenerateIds } = body;
      const result = await importDocuments(dataStoreId, {
        ...(bigquerySource && { bigquerySource }),
        ...(gcsSource && { gcsSource }),
        ...(reconciliationMode && { reconciliationMode }),
        ...(autoGenerateIds !== undefined && { autoGenerateIds }),
      });
      return NextResponse.json(result);
    }

    if (action === 'purge') {
      const { filter } = body;
      const result = await purgeDocuments(dataStoreId, filter || '*');
      return NextResponse.json(result);
    }

    // Default: create document
    const { document, documentId } = body;
    if (!document) {
      return NextResponse.json({ error: 'document is required' }, { status: 400 });
    }

    const result = await createDocument(dataStoreId, document, undefined, documentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Documents POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Document operation failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const documentName = searchParams.get('name');

  if (!documentName) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    await deleteDocument(documentName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 },
    );
  }
}
