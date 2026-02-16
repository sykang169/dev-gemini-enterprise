import { NextResponse } from 'next/server';
import { streamAssist } from '@/lib/gemini-client';
import { inspectText } from '@/lib/dlp-client';
import type { StreamAssistRequest, DataStoreSpec, AgentSpec } from '@/types/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      query,
      sessionId,
      fileIds,
      dataStores,
      agents,
      enableWebGrounding,
      model,
      userPseudoId,
    } = body as {
      query: string;
      sessionId?: string;
      fileIds?: string[];
      dataStores?: string[];
      agents?: string[];
      enableWebGrounding?: boolean;
      model?: string;
      userPseudoId?: string;
    };

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query field is required' },
        { status: 400 },
      );
    }

    // DLP inspection
    const dlpResult = await inspectText(query);
    if (!dlpResult.safe) {
      return NextResponse.json(
        {
          error: 'sensitive_data_detected',
          findings: dlpResult.findings,
          safe: false,
        },
        { status: 422 },
      );
    }

    // Build streamAssist request
    const streamRequest: StreamAssistRequest = {
      query: { text: query },
    };

    if (sessionId) {
      streamRequest.session = sessionId;
    }

    // Note: userPseudoId is used for session scoping only (createSession),
    // not accepted by the streamAssist endpoint.

    if (model && model !== 'auto') {
      streamRequest.answerGenerationSpec = {
        modelSpec: {
          modelVersion: model,
        },
      };
    }

    if (fileIds && fileIds.length > 0) {
      streamRequest.fileIds = fileIds;
    }

    if (agents && agents.length > 0) {
      streamRequest.agentsSpec = {
        agentSpecs: agents.map((id: string): AgentSpec => ({ agentId: id })),
      };
    }

    const toolsSpec: StreamAssistRequest['toolsSpec'] = {};
    if (dataStores && dataStores.length > 0) {
      toolsSpec.vertexAiSearchSpec = {
        dataStoreSpecs: dataStores.map((ds: string): DataStoreSpec => ({ dataStore: ds })),
      };
    }
    if (enableWebGrounding) {
      toolsSpec.webGroundingSpec = {};
    }
    if (Object.keys(toolsSpec).length > 0) {
      streamRequest.toolsSpec = toolsSpec;
    }

    // Call streamAssist and proxy the SSE response
    const response = await streamAssist(streamRequest);

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
