'use client';

import { useState, useRef, useEffect } from 'react';
import type { UserProfile } from '@/types/gemini';

interface UserProfileMenuProps {
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

function getInitial(user: UserProfile): string {
  if (user.givenName) return user.givenName.charAt(0).toUpperCase();
  if (user.name) return user.name.charAt(0).toUpperCase();
  if (user.email) return user.email.charAt(0).toUpperCase();
  return 'U';
}

function getAvatarColor(email: string): string {
  const colors = [
    'bg-blue-600', 'bg-red-500', 'bg-green-600', 'bg-purple-600',
    'bg-orange-500', 'bg-teal-600', 'bg-pink-600', 'bg-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function UserProfileMenu({ user, onSignIn, onSignOut }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!user) {
    // Signed out state: show sign-in button
    return (
      <button
        onClick={onSignIn}
        className="flex h-8 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-750"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        Sign in
      </button>
    );
  }

  const initial = getInitial(user);
  const avatarColor = getAvatarColor(user.email);
  const isMicrosoft = user.authProvider === 'microsoft';
  const managedBy = isMicrosoft
    ? 'Managed by Microsoft Entra ID'
    : user.hd ? `Managed by ${user.hd}` : '';

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label="Open user menu"
        aria-expanded={isOpen}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="h-8 w-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${avatarColor} text-xs font-medium text-white`}>
            {initial}
          </div>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setIsOpen(false)} />

          <div className="profile-menu-enter absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            {/* Header with email and close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.email}
                </p>
                {managedBy && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {managedBy}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Admin console link */}
            {(user.hd || isMicrosoft) && (
              <div className="px-5 pb-2">
                <a
                  href={isMicrosoft ? 'https://entra.microsoft.com/' : 'https://admin.google.com/?hl=ko'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {isMicrosoft ? 'Entra admin center' : 'Admin console'}
                </a>
              </div>
            )}

            {/* Large avatar and greeting */}
            <div className="flex flex-col items-center px-5 py-4">
              <div className="relative mb-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-20 w-20 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full ${avatarColor} text-3xl font-medium text-white`}>
                    {initial}
                  </div>
                )}
                {/* Camera icon overlay */}
                <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 dark:border-gray-900 dark:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Hi, {user.givenName || user.name.split(' ')[0]}!
              </h2>

              {/* Manage account button */}
              <a
                href={isMicrosoft ? 'https://myaccount.microsoft.com/' : 'https://myaccount.google.com/'}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-gray-600 dark:text-blue-400 dark:hover:bg-gray-800"
              >
                {isMicrosoft ? 'Manage your Microsoft Account' : 'Manage your Google Account'}
              </a>
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-gray-200 dark:border-gray-700" />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
              {/* Add account */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignIn();
                }}
                className="flex items-center justify-center gap-2 bg-white px-4 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
                Add account
              </button>

              {/* Sign out */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="flex items-center justify-center gap-2 bg-white px-4 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                </svg>
                Sign out
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/50">
              <a
                href={isMicrosoft ? 'https://privacy.microsoft.com/privacystatement' : 'https://policies.google.com/privacy'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Privacy Policy
              </a>
              <span className="text-xs text-gray-400 dark:text-gray-500">&#x2022;</span>
              <a
                href={isMicrosoft ? 'https://www.microsoft.com/servicesagreement' : 'https://policies.google.com/terms'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
