import { PublicClientApplication, type Configuration } from '@azure/msal-browser';

const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '';
const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || 'common';

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

export const loginScopes = ['openid', 'profile', 'email', 'User.Read'];

let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }
  return msalInstance;
}

export function isMicrosoftConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
}
