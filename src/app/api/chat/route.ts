import { NextResponse } from 'next/server';
import { streamAssist } from '@/lib/gemini-client';
import { inspectText } from '@/lib/dlp-client';
import type {
  StreamAssistRequest,
  DataStoreSpec,
  AdvancedChatSettings,
} from '@/types/gemini';

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
      advancedSettings,
    } = body as {
      query: string;
      sessionId?: string;
      fileIds?: string[];
      dataStores?: string[];
      agents?: string[];
      enableWebGrounding?: boolean;
      model?: string;
      userPseudoId?: string;
      advancedSettings?: AdvancedChatSettings;
    };

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query field is required' },
        { status: 400 },
      );
    }

    // DLP inspection (skip for system-generated queries like "Start Research")
    const skipDlp = query === 'Start Research';
    if (!skipDlp) {
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

    // ── answerGenerationSpec ──
    const answerGenSpec: StreamAssistRequest['answerGenerationSpec'] = {};

    if (model && model !== 'auto') {
      answerGenSpec.modelSpec = { modelVersion: model };
    }

    if (advancedSettings?.preamble) {
      answerGenSpec.promptSpec = { preamble: advancedSettings.preamble };
    }

    if (advancedSettings?.answerLanguageCode) {
      answerGenSpec.answerLanguageCode = advancedSettings.answerLanguageCode;
    }

    if (advancedSettings?.ignoreAdversarialQuery) {
      answerGenSpec.ignoreAdversarialQuery = true;
    }

    if (advancedSettings?.ignoreNonAnswerSeekingQuery) {
      answerGenSpec.ignoreNonAnswerSeekingQuery = true;
    }

    if (advancedSettings?.ignoreLowRelevantContent) {
      answerGenSpec.ignoreLowRelevantContent = true;
    }

    if (Object.keys(answerGenSpec).length > 0) {
      streamRequest.answerGenerationSpec = answerGenSpec;
    }

    // ── queryUnderstandingSpec ──
    const querySpec: StreamAssistRequest['queryUnderstandingSpec'] = {};

    if (advancedSettings?.queryRephraserDisabled || advancedSettings?.maxRephraseSteps) {
      querySpec.queryRephraserSpec = {};
      if (advancedSettings.queryRephraserDisabled) {
        querySpec.queryRephraserSpec.disable = true;
      }
      if (advancedSettings.maxRephraseSteps && !advancedSettings.queryRephraserDisabled) {
        querySpec.queryRephraserSpec.maxRephraseSteps = advancedSettings.maxRephraseSteps;
      }
    }

    if (advancedSettings?.queryClassificationTypes && advancedSettings.queryClassificationTypes.length > 0) {
      querySpec.queryClassificationSpec = {
        types: advancedSettings.queryClassificationTypes,
      };
    }

    if (Object.keys(querySpec).length > 0) {
      streamRequest.queryUnderstandingSpec = querySpec;
    }

    // ── searchSpec ──
    const searchParams: NonNullable<StreamAssistRequest['searchSpec']>['searchParams'] = {};

    if (advancedSettings?.searchFilter) {
      searchParams.filter = advancedSettings.searchFilter;
    }

    if (advancedSettings?.boostSpecs && advancedSettings.boostSpecs.length > 0) {
      const validSpecs = advancedSettings.boostSpecs.filter((s) => s.condition);
      if (validSpecs.length > 0) {
        searchParams.boostSpec = { conditionBoostSpecs: validSpecs };
      }
    }

    if (advancedSettings?.maxReturnResults) {
      searchParams.maxReturnResults = advancedSettings.maxReturnResults;
    }

    if (advancedSettings?.searchResultMode) {
      searchParams.searchResultMode = advancedSettings.searchResultMode;
    }

    if (Object.keys(searchParams).length > 0) {
      streamRequest.searchSpec = { searchParams };
    }

    if (fileIds && fileIds.length > 0) {
      streamRequest.fileIds = fileIds;
    }

    if (agents && agents.length > 0) {
      streamRequest.agentsSpec = {
        agentSpecs: { agentId: agents[0] },
      };
    }

    const isDeepResearch = agents && agents.includes('deep_research');

    const toolsSpec: StreamAssistRequest['toolsSpec'] = {};
    if (dataStores && dataStores.length > 0) {
      toolsSpec.vertexAiSearchSpec = {
        dataStoreSpecs: dataStores.map((ds: string): DataStoreSpec => ({ dataStore: ds })),
      };
    }
    // Deep Research requires webGroundingSpec to trigger the research plan flow
    if (enableWebGrounding || isDeepResearch) {
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
