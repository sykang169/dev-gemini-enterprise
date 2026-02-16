import { getAccessToken, getProjectId, invalidateAccessToken } from './auth';
import {
  STREAM_ASSIST_BASE_URL,
  STREAM_ASSIST_BASE_URL_ALPHA,
  buildStreamAssistPath,
  buildSessionPath,
  buildAgentListPath,
} from './constants';
import type { StreamAssistRequest, Session, Agent } from '@/types/gemini';

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

export async function streamAssist(
  request: StreamAssistRequest,
): Promise<Response> {
  let token = await getAccessToken();
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildStreamAssistPath(projectId, location, appId);
  const body = JSON.stringify(request);

  let response = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  // Retry once with a fresh token on 401
  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`streamAssist API error (${response.status}): ${errorText}`);
  }

  return response;
}

export async function createSession(
  displayName?: string,
  userPseudoId?: string,
): Promise<Session> {
  let token = await getAccessToken();
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildSessionPath(projectId, location, appId);
  const body = JSON.stringify({
    displayName: displayName || `Session ${new Date().toISOString()}`,
    ...(userPseudoId && { userPseudoId }),
  });

  let response = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  // Retry once with a fresh token on 401
  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`createSession error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function listSessions(userPseudoId?: string): Promise<Session[]> {
  let token = await getAccessToken();
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const path = buildSessionPath(projectId, location, appId);

  // List all sessions (no filter) so we see sessions from both
  // the official Gemini Enterprise UI and this custom frontend.
  // The official UI uses a numeric Google ID as userPseudoId while
  // this frontend uses the user email, so filtering would miss sessions.
  const url = `${baseUrl}/${path}`;

  let response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Retry once with a fresh token on 401
  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`listSessions error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.sessions || [];
}

export async function deleteSession(sessionName: string): Promise<void> {
  let token = await getAccessToken();
  const { endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);

  let response = await fetch(`${baseUrl}/${sessionName}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Retry once with a fresh token on 401
  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(`${baseUrl}/${sessionName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`deleteSession error (${response.status}): ${errorText}`);
  }
}

/**
 * Fetch the list of agents from the Gemini Enterprise v1alpha API.
 */
export async function listAgents(): Promise<Agent[]> {
  let token = await getAccessToken();
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL_ALPHA(endpointLocation);
  const path = buildAgentListPath(projectId, location, appId);
  const url = `${baseUrl}/${path}`;

  let response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`listAgents error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawAgents: Array<{
    name: string;
    displayName?: string;
    description?: string;
    state?: string;
  }> = data.agents || [];

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

export async function getSession(sessionName: string): Promise<Session> {
  let token = await getAccessToken();
  const { endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const url = `${baseUrl}/${sessionName}?includeAnswerDetails=true`;

  let response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`getSession error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function getAnswer(
  answerName: string,
): Promise<{
  answerText?: string;
  state?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replies?: any[];
}> {
  let token = await getAccessToken();
  const { endpointLocation } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);

  let response = await fetch(`${baseUrl}/${answerName}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(`${baseUrl}/${answerName}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`getAnswer error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function addContextFile(
  fileContent: string,
  fileName: string,
  mimeType: string,
): Promise<{ fileId: string }> {
  let token = await getAccessToken();
  const projectId = await getProjectId();
  const { location, endpointLocation, appId } = getConfig();

  const baseUrl = STREAM_ASSIST_BASE_URL(endpointLocation);
  const enginePath = `projects/${projectId}/locations/${location}/collections/default_collection/engines/${appId}`;
  const url = `${baseUrl}/${enginePath}/assistants/default_assistant:addContextFile`;
  const body = JSON.stringify({
    file: {
      displayName: fileName,
      content: {
        mimeType,
        rawBytes: fileContent,
      },
    },
  });

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  // Retry once with a fresh token on 401
  if (response.status === 401) {
    token = await getFreshToken();
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`addContextFile error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return { fileId: data.fileId || data.name };
}
