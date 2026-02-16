import { NextResponse } from 'next/server';
import { listAgents } from '@/lib/gemini-client';

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ agents: [] });
  }
}
