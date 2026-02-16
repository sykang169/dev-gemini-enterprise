'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserProfile } from '@/types/gemini';
import { getMsalInstance, loginScopes, isMicrosoftConfigured } from '@/lib/msal-config';
import type { PublicClientApplication } from '@azure/msal-browser';

const STORAGE_KEY = 'gemini-user-profile';

function loadProfile(): UserProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const profile = JSON.parse(saved) as UserProfile;
      // Backward compat: existing profiles without authProvider default to 'google'
      if (!profile.authProvider) {
        profile.authProvider = 'google';
      }
      return profile;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveProfile(profile: UserProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

// Decode JWT payload without library
function decodeJwtPayload(token: string): Record<string, string> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const msalRef = useRef<PublicClientApplication | null>(null);

  // Load profile from localStorage on mount
  useEffect(() => {
    const profile = loadProfile();
    if (profile) setUser(profile);
    setIsLoaded(true);
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if script already exists
    if (document.getElementById('google-identity-script')) return;

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Pre-warm MSAL instance (non-blocking)
  useEffect(() => {
    if (isMicrosoftConfigured()) {
      getMsalInstance().then((instance) => {
        msalRef.current = instance;
      }).catch(() => {
        // Silently fail — error will surface when user clicks login
      });
    }
  }, []);

  const handleCredentialResponse = useCallback((response: { credential: string }) => {
    const payload = decodeJwtPayload(response.credential);
    const profile: UserProfile = {
      email: payload.email || '',
      name: payload.name || '',
      picture: payload.picture || '',
      givenName: payload.given_name || '',
      familyName: payload.family_name || '',
      hd: payload.hd || '',
      authProvider: 'google',
    };
    setUser(profile);
    saveProfile(profile);
  }, []);

  const signInWithGoogle = useCallback(() => {
    const google = (window as unknown as { google?: { accounts?: { id?: {
      initialize: (config: Record<string, unknown>) => void;
      prompt: () => void;
    } } } }).google;

    if (!google?.accounts?.id) {
      alert('Google Identity Services not loaded. Please refresh the page.');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Demo mode: use a mock profile
      const mockProfile: UserProfile = {
        email: 'admin@seyongkang.altostrat.com',
        name: 'Super Admin',
        givenName: 'Super',
        familyName: 'Admin',
        hd: 'seyongkang.altostrat.com',
        authProvider: 'demo',
      };
      setUser(mockProfile);
      saveProfile(mockProfile);
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
    });
    google.accounts.id.prompt();
  }, [handleCredentialResponse]);

  const signInWithMicrosoft = useCallback(async () => {
    try {
      const instance = msalRef.current || await getMsalInstance();
      msalRef.current = instance;

      const result = await instance.loginPopup({
        scopes: loginScopes,
      });

      const account = result.account;
      const profile: UserProfile = {
        email: account.username || '',
        name: account.name || account.username || '',
        givenName: account.name?.split(' ')[0] || '',
        familyName: account.name?.split(' ').slice(1).join(' ') || '',
        authProvider: 'microsoft',
        tenantId: account.tenantId || '',
      };
      setUser(profile);
      saveProfile(profile);
    } catch (error: unknown) {
      // BrowserAuthError with errorCode 'user_cancelled' — user closed the popup
      const msalError = error as { errorCode?: string; message?: string };
      if (msalError.errorCode === 'user_cancelled') {
        return;
      }
      // Popup blocked or other error
      if (msalError.errorCode === 'popup_window_error') {
        alert('Popup blocked. Please allow popups for this site and try again.');
        return;
      }
      console.error('Microsoft sign-in error:', error);
    }
  }, []);

  // Backward-compatible alias
  const signIn = signInWithGoogle;

  const signOut = useCallback(async () => {
    const currentProvider = user?.authProvider;
    setUser(null);
    saveProfile(null);

    if (currentProvider === 'microsoft') {
      // Clear MSAL cache
      try {
        const instance = msalRef.current || await getMsalInstance();
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          await instance.logoutPopup({ account: accounts[0] }).catch(() => {});
        }
      } catch {
        // ignore
      }
    } else {
      // Revoke Google session
      const google = (window as unknown as { google?: { accounts?: { id?: {
        revoke: (email: string, callback: () => void) => void;
        disableAutoSelect: () => void;
      } } } }).google;

      if (google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
      }
    }
  }, [user?.authProvider]);

  return { user, isLoaded, signIn, signInWithGoogle, signInWithMicrosoft, signOut };
}
