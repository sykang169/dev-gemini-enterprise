import { getAccessToken, getProjectId, invalidateAccessToken } from './auth';
import {
  STREAM_ASSIST_BASE_URL,
  STREAM_ASSIST_BASE_URL_ALPHA,
  buildStreamAssistPath,
  buildSessionPath,
  buildAgentListPath,
  buildCompleteQueryPath,
  buildRecommendPath,
  buildDocumentsPath,
  buildUserEventsPath,
} from './constants';
import type {
  StreamAssistRequest,
  Session,
  Agent,
  AgentCreateRequest,
  CompleteQueryResponse,
  RecommendResponse,
  RecommendRequest,
  DocumentResource,
  ImportDocumentsRequest,
  UserEventInput,
  LongRunningOperation,
} from '@/types/gemini';

function getConfig() {
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
  const endpointLocation = process.env.ENDPOINT_LOCATION || 'us';
  const appId = process.env.GEMINI_APP_ID || '';
  return { location, endpointLocation, appId };
}

/** Get a fresh token, invalidating the cache first. */
async function getFreshToken(): Promise<string> {
  invalidateAccessToken();
  return getAccessToken();
}

/** Generic fetch with 401 retry. */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let token = await getAccessToken();
  const headers = { ...init.headers, Authorization: `Bearer ${token}` } as Record<string, string>;

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    token = await getFreshToken();
    headers.Authorization = `Bearer ${token}`;
    response = await fetch(url, { ...init, headers });
  }

  return response;
}

async function fetchJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const response = await fetchWithRetry(url, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${label} error (${response.status}): ${errorText}`);
  }
  return response.json();
}

async function fetchVoid(url: string, init: RequestInit, label: string): Promise<void> {
  const response = await fetchWithRetry(url, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${label} error (${response.status}): ${errorText}`);
  }
}

// ─── StreamAssist ────────────────────────────────────────────────

export async function streamAssist(
  request: StreamAssistRequest,
): Promise<Response> {
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildStreamAssistPath(projectId, location, appId);
  const body = JSON.stringify(request);

  const response = await fetchWithRetry(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`streamAssist API error (${response.status}): ${errorText}`);
  }

  return response;
}

// ─── Sessions ────────────────────────────────────────────────────

export async function createSession(
  displayName?: string,
  userPseudoId?: string,
): Promise<Session> {
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildSessionPath(projectId, location, appId);

  return fetchJson(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: displayName || `Session ${new Date().toISOString()}`,
      ...(userPseudoId && { userPseudoId }),
    }),
  }, 'createSession');
}

export async function listSessions(): Promise<Session[]> {
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildSessionPath(projectId, location, appId);
  const url = `${baseUrl}/${path}`;

  const data = await fetchJson<{ sessions?: Session[] }>(url, { method: 'GET' }, 'listSessions');
  return data.sessions || [];
}

export async function deleteSession(sessionName: string): Promise<void> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  return fetchVoid(`${baseUrl}/${sessionName}`, { method: 'DELETE' }, 'deleteSession');
}

export async function getSession(sessionName: string): Promise<Session> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const url = `${baseUrl}/${sessionName}?includeAnswerDetails=true`;
  return fetchJson(url, { method: 'GET' }, 'getSession');
}

export async function updateSession(
  sessionName: string,
  fields: { displayName?: string },
): Promise<Session> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const updateMask = Object.keys(fields).join(',');
  const url = `${baseUrl}/${sessionName}?updateMask=${updateMask}`;
  return fetchJson(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  }, 'updateSession');
}

// ─── Answers ─────────────────────────────────────────────────────

export async function getAnswer(
  answerName: string,
): Promise<{
  answerText?: string;
  state?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replies?: any[];
}> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  return fetchJson(`${baseUrl}/${answerName}`, { method: 'GET' }, 'getAnswer');
}

// ─── File Context ────────────────────────────────────────────────

export async function addContextFile(
  fileContent: string,
  fileName: string,
  mimeType: string,
): Promise<{ fileId: string }> {
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const enginePath = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${appId}`;
  const url = `${baseUrl}/${enginePath}/assistants/default_assistant:addContextFile`;

  const data = await fetchJson<{ fileId?: string; name?: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file: {
        displayName: fileName,
        content: { mimeType, rawBytes: fileContent },
      },
    }),
  }, 'addContextFile');

  return { fileId: data.fileId || data.name || '' };
}

// ─── Agents ──────────────────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL_ALPHA(endpointLocation);
  const path = buildAgentListPath(projectId, location, appId);
  const url = `${baseUrl}/${path}`;

  const data = await fetchJson<{
    agents?: Array<{
      name: string;
      displayName?: string;
      description?: string;
      state?: string;
    }>;
  }>(url, { method: 'GET' }, 'listAgents');

  const rawAgents = data.agents || [];
  return rawAgents
    .filter((a) => a.state === 'ENABLED')
    .map((a) => ({
      name: a.name,
      displayName: a.displayName || a.name.split('/').pop() || '',
      agentId: a.name.split('/').pop() || '',
      description: a.description,
      state: a.state,
    }));
}

export async function createAgent(agentData: AgentCreateRequest): Promise<Agent> {
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL_ALPHA(endpointLocation);
  const path = buildAgentListPath(projectId, location, appId);
  const url = `${baseUrl}/${path}`;

  const raw = await fetchJson<{
    name: string;
    displayName?: string;
    description?: string;
    state?: string;
  }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentData),
  }, 'createAgent');

  return {
    name: raw.name,
    displayName: raw.displayName || '',
    agentId: raw.name.split('/').pop() || '',
    description: raw.description,
    state: raw.state,
  };
}

export async function updateAgent(
  agentName: string,
  fields: { displayName?: string; description?: string },
): Promise<Agent> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL_ALPHA(endpointLocation);
  const updateMask = Object.keys(fields).join(',');
  const url = `${baseUrl}/${agentName}?updateMask=${updateMask}`;

  const raw = await fetchJson<{
    name: string;
    displayName?: string;
    description?: string;
    state?: string;
  }>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  }, 'updateAgent');

  return {
    name: raw.name,
    displayName: raw.displayName || '',
    agentId: raw.name.split('/').pop() || '',
    description: raw.description,
    state: raw.state,
  };
}

export async function deleteAgent(agentName: string): Promise<void> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL_ALPHA(endpointLocation);
  return fetchVoid(`${baseUrl}/${agentName}`, { method: 'DELETE' }, 'deleteAgent');
}

export async function deployAgent(agentName: string): Promise<LongRunningOperation> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL_ALPHA(endpointLocation);
  return fetchJson(`${baseUrl}/${agentName}:deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, 'deployAgent');
}

// ─── Autocomplete ────────────────────────────────────────────────

export async function completeQuery(
  dataStoreId: string,
  query: string,
  queryModel?: string,
): Promise<CompleteQueryResponse> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildCompleteQueryPath(projectId, location, dataStoreId);
  const params = new URLSearchParams({ query });
  if (queryModel) params.set('queryModel', queryModel);
  const url = `${baseUrl}/${path}?${params.toString()}`;

  return fetchJson(url, { method: 'GET' }, 'completeQuery');
}

// ─── Recommend ───────────────────────────────────────────────────

export async function recommend(
  dataStoreId: string,
  request: RecommendRequest,
  servingConfigId?: string,
): Promise<RecommendResponse> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildRecommendPath(projectId, location, dataStoreId, servingConfigId);
  const url = `${baseUrl}/${path}`;

  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 'recommend');
}

// ─── Documents ───────────────────────────────────────────────────

export async function listDocuments(
  dataStoreId: string,
  branchId?: string,
  pageSize?: number,
  pageToken?: string,
): Promise<{ documents: DocumentResource[]; nextPageToken?: string }> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildDocumentsPath(projectId, location, dataStoreId, branchId);
  const params = new URLSearchParams();
  if (pageSize) params.set('pageSize', String(pageSize));
  if (pageToken) params.set('pageToken', pageToken);
  const qs = params.toString();
  const url = qs ? `${baseUrl}/${path}?${qs}` : `${baseUrl}/${path}`;

  return fetchJson(url, { method: 'GET' }, 'listDocuments');
}

export async function getDocument(documentName: string): Promise<DocumentResource> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  return fetchJson(`${baseUrl}/${documentName}`, { method: 'GET' }, 'getDocument');
}

export async function createDocument(
  dataStoreId: string,
  document: DocumentResource,
  branchId?: string,
  documentId?: string,
): Promise<DocumentResource> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildDocumentsPath(projectId, location, dataStoreId, branchId);
  const params = new URLSearchParams();
  if (documentId) params.set('documentId', documentId);
  const qs = params.toString();
  const url = qs ? `${baseUrl}/${path}?${qs}` : `${baseUrl}/${path}`;

  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  }, 'createDocument');
}

export async function deleteDocument(documentName: string): Promise<void> {
  const { endpointLocation } = getConfig();
  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  return fetchVoid(`${baseUrl}/${documentName}`, { method: 'DELETE' }, 'deleteDocument');
}

export async function importDocuments(
  dataStoreId: string,
  request: ImportDocumentsRequest,
  branchId?: string,
): Promise<LongRunningOperation> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildDocumentsPath(projectId, location, dataStoreId, branchId);
  const url = `${baseUrl}/${path}:import`;

  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }, 'importDocuments');
}

export async function purgeDocuments(
  dataStoreId: string,
  filter: string,
  branchId?: string,
): Promise<LongRunningOperation> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildDocumentsPath(projectId, location, dataStoreId, branchId);
  const url = `${baseUrl}/${path}:purge`;

  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filter }),
  }, 'purgeDocuments');
}

// ─── User Events ─────────────────────────────────────────────────

export async function writeUserEvent(
  dataStoreId: string,
  event: UserEventInput,
): Promise<UserEventInput> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildUserEventsPath(projectId, location, dataStoreId);
  const url = `${baseUrl}/${path}:write`;

  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }, 'writeUserEvent');
}

export async function importUserEvents(
  dataStoreId: string,
  source: { bigquerySource?: { projectId: string; datasetId: string; tableId: string }; gcsSource?: { inputUris: string[] } },
): Promise<LongRunningOperation> {
  const projectId = await getProjectId();
  const { location, endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildUserEventsPath(projectId, location, dataStoreId);
  const url = `${baseUrl}/${path}:import`;

  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inlineSource: source }),
  }, 'importUserEvents');
}
