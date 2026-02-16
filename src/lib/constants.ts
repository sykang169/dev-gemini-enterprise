export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  DLP: '/api/dlp',
  SESSIONS: '/api/sessions',
  FILES: '/api/files',
  DATASTORES: '/api/datastores',
  AGENTS: '/api/agents',
  AUTH: '/api/auth',
} as const;

export const SUPPORTED_FILE_FORMATS = [
  'application/pdf',
  'text/plain',
  'text/html',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = [
  '.pdf', '.txt', '.html', '.csv', '.docx', '.xlsx', '.pptx',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const MAX_MESSAGE_LENGTH = 10000;

export const GEMINI_MODELS: { id: string; label: string; description: string; preview?: boolean }[] = [
  { id: 'auto', label: 'Auto (default)', description: 'Gemini Enterprise chooses the best fit' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'For everyday tasks' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Best for complex tasks' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', description: 'Frontier intelligence built for speed', preview: true },
  { id: 'gemini-3-pro', label: 'Gemini 3 Pro', description: 'State-of-the-art reasoning', preview: true },
];

export const DLP_INFO_TYPES = [
  'PHONE_NUMBER',
  'EMAIL_ADDRESS',
  'CREDIT_CARD_NUMBER',
  'KOREA_RRN',
  'KOREA_PASSPORT',
  'PERSON_NAME',
  'STREET_ADDRESS',
  'IP_ADDRESS',
] as const;

export const STREAM_ASSIST_BASE_URL = (endpointLocation: string) =>
  `https://${endpointLocation}-discoveryengine.googleapis.com/v1`;

export const STREAM_ASSIST_BASE_URL_ALPHA = (endpointLocation: string) =>
  `https://${endpointLocation}-discoveryengine.googleapis.com/v1alpha`;

export const buildStreamAssistPath = (
  projectId: string,
  location: string,
  appId: string,
) =>
  `projects/${projectId}/locations/${location}/collections/default_collection/engines/${appId}/assistants/default_assistant:streamAssist`;

export const buildSessionPath = (
  projectId: string,
  location: string,
  appId: string,
  sessionId?: string,
) => {
  const base = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${appId}/sessions`;
  return sessionId ? `${base}/${sessionId}` : base;
};

export const buildAgentListPath = (
  projectId: string,
  location: string,
  appId: string,
) =>
  `projects/${projectId}/locations/${location}/collections/default_collection/engines/${appId}/assistants/default_assistant/agents`;

export const buildDataStorePath = (
  projectId: string,
  location: string,
  dataStoreId?: string,
) => {
  const base = `projects/${projectId}/locations/${location}/collections/default_collection/dataStores`;
  return dataStoreId ? `${base}/${dataStoreId}` : base;
};
