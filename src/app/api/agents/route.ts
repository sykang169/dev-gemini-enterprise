import { NextRequest, NextResponse } from 'next/server';
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  deployAgent,
} from '@/lib/gemini-client';

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ agents: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'deploy') {
      const name = url.searchParams.get('name');
      if (!name) {
        return NextResponse.json({ error: 'name parameter required' }, { status: 400 });
      }
      const operation = await deployAgent(name);
      return NextResponse.json({ operation });
    }

    const body = await request.json();
    const { displayName, description, dataInsightsAgentConfig } = body;

    if (!displayName) {
      return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
    }

    const agent = await createAgent({
      displayName,
      description,
      dataInsightsAgentConfig,
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Create agent error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, displayName, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const fields: { displayName?: string; description?: string } = {};
    if (displayName !== undefined) fields.displayName = displayName;
    if (description !== undefined) fields.description = description;

    const agent = await updateAgent(name, fields);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Update agent error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'name parameter required' }, { status: 400 });
    }

    await deleteAgent(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete agent error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
