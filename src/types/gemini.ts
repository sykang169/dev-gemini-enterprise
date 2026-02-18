export type GeminiModel = 'auto' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-flash' | 'gemini-3-pro';

export interface GeminiModelOption {
  id: GeminiModel;
  label: string;
  description: string;
  preview?: boolean;
}

// ─── StreamAssist Request ────────────────────────────────────────

export interface StreamAssistRequest {
  query: {
    text: string;
  };
  session?: string;
  fileIds?: string[];

  answerGenerationSpec?: AnswerGenerationSpec;
  queryUnderstandingSpec?: QueryUnderstandingSpec;
  searchSpec?: SearchSpec;

  agentsSpec?: {
    agentSpecs: AgentSpec;
  };
  toolsSpec?: {
    vertexAiSearchSpec?: {
      dataStoreSpecs: DataStoreSpec[];
    };
    webGroundingSpec?: Record<string, never>;
  };
}

export interface AnswerGenerationSpec {
  modelSpec?: {
    modelVersion?: string;
  };
  promptSpec?: {
    preamble?: string;
  };
  includeCitations?: boolean;
  answerLanguageCode?: string;
  ignoreAdversarialQuery?: boolean;
  ignoreNonAnswerSeekingQuery?: boolean;
  ignoreLowRelevantContent?: boolean;
}

export interface QueryUnderstandingSpec {
  queryRephraserSpec?: {
    disable?: boolean;
    maxRephraseSteps?: number; // 1-5
  };
  queryClassificationSpec?: {
    types?: QueryClassificationType[];
  };
}

export type QueryClassificationType = 'ADVERSARIAL_QUERY' | 'NON_ANSWER_SEEKING_QUERY';

export interface SearchSpec {
  searchParams?: {
    maxReturnResults?: number;
    filter?: string;
    boostSpec?: BoostSpec;
    orderBy?: string;
    searchResultMode?: 'DOCUMENTS' | 'CHUNKS';
  };
}

export interface BoostSpec {
  conditionBoostSpecs?: ConditionBoostSpec[];
}

export interface ConditionBoostSpec {
  condition?: string;
  boost?: number; // -1.0 to 1.0
}

export interface AgentSpec {
  agentId: string;
}

export interface DataStoreSpec {
  dataStore: string;
}

// ─── StreamAssist Response ───────────────────────────────────────

export interface StreamAssistResponse {
  answer?: {
    answerText?: string;
    state?: string;
    steps?: PlanningStep[];
    citations?: Citation[];
    references?: Reference[];
    replies?: StreamReply[];
    name?: string;
    assistSkippedReasons?: string[];
    diagnosticInfo?: {
      plannerSteps?: PlanningStep[];
    };
    queryUnderstandingInfo?: {
      queryClassificationInfo?: {
        type?: QueryClassificationType;
        positive?: boolean;
      }[];
    };
  };
  sessionInfo?: {
    session?: string;
    queryId?: string;
  };
  assistToken?: string;
  session?: string;
  queryId?: string;
}

export interface StreamReply {
  groundedContent?: {
    content?: {
      role?: string;
      text?: string;
      thought?: boolean;
    };
    contentMetadata?: {
      contentKind?: 'RESEARCH_PLAN' | 'RESEARCH_QUESTION' | 'RESEARCH_ANSWER' | 'RESEARCH_AUDIO_SUMMARY' | string;
    };
    textGroundingMetadata?: TextGroundingMetadata;
  };
}

export interface TextGroundingMetadata {
  references?: TextGroundingReference[];
  segments?: TextGroundingSegment[];
}

export interface TextGroundingReference {
  documentMetadata?: {
    document?: string;
    uri?: string;
    title?: string;
    pageIdentifier?: string;
    domain?: string;
    mimeType?: string;
  };
}

export interface TextGroundingSegment {
  startIndex?: string;
  endIndex?: string;
  referenceIndices?: number[];
  text?: string;
}

export interface PlanningStep {
  state?: string;
  description?: string;
  actions?: StepAction[];
  thought?: string;
}

export interface StepAction {
  searchAction?: {
    query?: string;
  };
  observation?: {
    searchResults?: SearchResult[];
    groundingInfo?: {
      groundingSupport?: GroundingSupport[];
    };
  };
}

export interface GroundingSupport {
  segment?: string;
  groundingAttributions?: GroundingAttribution[];
}

export interface GroundingAttribution {
  document?: string;
  uri?: string;
  title?: string;
  confidenceScore?: number; // 0.0 - 1.0
}

export interface SearchResult {
  document?: string;
  uri?: string;
  title?: string;
  snippets?: string[];
}

export interface Citation {
  startIndex?: number;
  endIndex?: number;
  sources?: CitationSource[];
}

export interface CitationSource {
  referenceId?: string;
  uri?: string;
  title?: string;
}

export interface Reference {
  uri?: string;
  title?: string;
  chunkContent?: {
    content?: string;
    pageIdentifier?: string;
  };
}

// ─── Session ─────────────────────────────────────────────────────

export interface Session {
  name: string;
  displayName?: string;
  state?: string;
  userPseudoId?: string;
  turns?: Turn[];
  startTime?: string;
  endTime?: string;
  /** Agent ID extracted from displayName metadata (not stored in API natively). */
  agentId?: string;
}

export interface Turn {
  query?: {
    text: string;
    queryId?: string;
  };
  answer?: string;
}

// ─── Message (UI) ────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: Citation[];
  steps?: PlanningStep[];
  references?: Reference[];
  groundingSupports?: GroundingSupport[];
  groundingReferences?: TextGroundingReference[];
  isStreaming?: boolean;
  /** True when the message contains a Deep Research plan awaiting user confirmation. */
  hasResearchPlan?: boolean;
  /** Current thinking/research step shown during streaming (e.g. "Analyzing the Request"). */
  thinkingStep?: string;
  sessionInfo?: {
    session?: string;
  };
  followUpSuggestions?: string[];
  agentId?: string;
}

// ─── User ────────────────────────────────────────────────────────

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
  hd?: string; // hosted domain (Google Workspace)
  authProvider?: 'google' | 'microsoft' | 'demo';
  tenantId?: string; // Microsoft Entra ID tenant ID
}

export interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Agent ───────────────────────────────────────────────────────

export interface Agent {
  name: string;
  displayName: string;
  agentId: string;
  description?: string;
  state?: string;
}

export interface AgentCreateRequest {
  displayName: string;
  description?: string;
  dataInsightsAgentConfig?: DataInsightsAgentConfig;
}

export interface DataInsightsAgentConfig {
  bqProjectId: string;
  bqDatasetId: string;
  allowlistTables?: string[];
  blocklistTables?: string[];
  authorizationConfig?: {
    toolAuthorizations?: {
      authorization: string;
    }[];
  };
}

// ─── DataStore ───────────────────────────────────────────────────

export interface DataStore {
  name: string;
  displayName: string;
  industryVertical?: string;
  solutionTypes?: string[];
  createTime?: string;
  defaultSchemaId?: string;
}

// ─── File ────────────────────────────────────────────────────────

export interface FileUploadResponse {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
}

// ─── Autocomplete ────────────────────────────────────────────────

export interface CompleteQueryResponse {
  querySuggestions?: QuerySuggestion[];
  tailMatchTriggered?: boolean;
}

export interface QuerySuggestion {
  suggestion?: string;
  completableFieldPaths?: string[];
}

// ─── Recommend ───────────────────────────────────────────────────

export interface RecommendRequest {
  userEvent: UserEventInput;
  pageSize?: number;
  filter?: string;
  userLabels?: Record<string, string>;
}

export interface RecommendResponse {
  results?: RecommendResult[];
  attributionToken?: string;
  missingIds?: string[];
}

export interface RecommendResult {
  id?: string;
  document?: DocumentResource;
  metadata?: Record<string, string>;
}

// ─── Document ────────────────────────────────────────────────────

export interface DocumentResource {
  name?: string;
  id?: string;
  schemaId?: string;
  parentDocumentId?: string;
  derivedStructData?: Record<string, unknown>;
  content?: {
    rawBytes?: string;
    uri?: string;
    mimeType?: string;
  };
  jsonData?: string;
}

export interface ImportDocumentsRequest {
  bigquerySource?: { projectId: string; datasetId: string; tableId: string };
  gcsSource?: { inputUris: string[] };
  inlineSource?: { documents: DocumentResource[] };
  reconciliationMode?: 'INCREMENTAL' | 'FULL';
  autoGenerateIds?: boolean;
}

// ─── User Event ──────────────────────────────────────────────────

export interface UserEventInput {
  eventType: string;
  userPseudoId: string;
  eventTime?: string;
  userInfo?: {
    userId?: string;
    userAgent?: string;
  };
  pageInfo?: {
    pageviewId?: string;
    pageCategory?: string;
    uri?: string;
    referrerUri?: string;
  };
  searchInfo?: {
    searchQuery?: string;
    orderBy?: string;
    offset?: number;
  };
  documents?: { id?: string; name?: string; uri?: string; quantity?: number }[];
  tagIds?: string[];
  attributes?: Record<string, { text?: string[]; numbers?: number[] }>;
}

// ─── Long-running Operation ──────────────────────────────────────

export interface LongRunningOperation {
  name?: string;
  done?: boolean;
  error?: { code?: number; message?: string };
  metadata?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

// ─── Advanced Chat Settings (UI state) ───────────────────────────

export interface AdvancedChatSettings {
  preamble?: string;
  answerLanguageCode?: string;
  ignoreAdversarialQuery?: boolean;
  ignoreNonAnswerSeekingQuery?: boolean;
  ignoreLowRelevantContent?: boolean;
  queryRephraserDisabled?: boolean;
  maxRephraseSteps?: number;
  queryClassificationTypes?: QueryClassificationType[];
  searchFilter?: string;
  boostSpecs?: ConditionBoostSpec[];
  maxReturnResults?: number;
  searchResultMode?: 'DOCUMENTS' | 'CHUNKS';
}
