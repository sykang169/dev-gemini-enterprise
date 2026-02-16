import { NextResponse } from 'next/server';
import { addContextFile } from '@/lib/gemini-client';
import { SUPPORTED_FILE_FORMATS, MAX_FILE_SIZE } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    if (!SUPPORTED_FILE_FORMATS.includes(file.type as typeof SUPPORTED_FILE_FORMATS[number])) {
      return NextResponse.json(
        { error: `Unsupported file format: ${file.type}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const base64Content = Buffer.from(buffer).toString('base64');

    const result = await addContextFile(base64Content, file.name, file.type);

    return NextResponse.json({
      fileId: result.fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 },
    );
  }
}
