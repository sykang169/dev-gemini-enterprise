import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET() {
  try {
    await getAccessToken();
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication failed' },
      { status: 401 },
    );
  }
}
