export type GeminiModel = 'auto' | 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-flash' | 'gemini-3-pro';

export interface GeminiModelOption {
  id: GeminiModel;
  label: string;
  description: string;
  preview?: boolean;
}

export interface StreamAssistRequest {
  query: {
    text: string;
  };
  session?: string;
  answerGenerationSpec?: {
    modelSpec?: {
      modelVersion?: string;
    };
  };
  fileIds?: string[];
  agentsSpec?: {
    agentSpecs: AgentSpec[];
  };
  toolsSpec?: {
    vertexAiSearchSpec?: {
      dataStoreSpecs: DataStoreSpec[];
    };
    webGroundingSpec?: Record<string, never>;
  };
}

export interface AgentSpec {
  agentId: string;
}

export interface DataStoreSpec {
  dataStore: string;
}

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
  };
  sessionInfo?: {
    session?: string;
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
  };
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
  };
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

export interface Session {
  name: string;
  displayName?: string;
  state?: string;
  userPseudoId?: string;
  turns?: Turn[];
  startTime?: string;
  endTime?: string;
}

export interface Turn {
  query?: {
    text: string;
    queryId?: string;
  };
  answer?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: Citation[];
  steps?: PlanningStep[];
  references?: Reference[];
  isStreaming?: boolean;
  sessionInfo?: {
    session?: string;
  };
  followUpSuggestions?: string[];
  agentId?: string;
}

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

export interface Agent {
  name: string;
  displayName: string;
  agentId: string;
  description?: string;
  state?: string;
}

export interface DataStore {
  name: string;
  displayName: string;
  industryVertical?: string;
  solutionTypes?: string[];
  createTime?: string;
  defaultSchemaId?: string;
}

export interface FileUploadResponse {
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
}
