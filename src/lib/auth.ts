import { GoogleAuth } from 'google-auth-library';

let authClient: GoogleAuth | null = null;
let cachedToken: { token: string; expiry: number } | null = null;

function getAuthClient(): GoogleAuth {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return authClient;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiry > Date.now() + 60000) {
    return cachedToken.token;
  }

  const auth = getAuthClient();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error('Failed to obtain access token');
  }

  cachedToken = {
    token: tokenResponse.token,
    expiry: Date.now() + 3500 * 1000, // ~58 minutes
  };

  return cachedToken.token;
}

/** Invalidate the cached token so the next call fetches a fresh one. */
export function invalidateAccessToken(): void {
  cachedToken = null;
}

export async function getProjectId(): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (projectId) return projectId;

  const auth = getAuthClient();
  const detectedProjectId = await auth.getProjectId();
  return detectedProjectId;
}
