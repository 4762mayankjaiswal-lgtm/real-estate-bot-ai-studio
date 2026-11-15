import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account consent' });

// Keep access token in memory per security best practices
let inMemoryAccessToken: string | null = null;
let inMemoryUserProfile: StoredWorkspaceAuth | null = null;

export interface StoredWorkspaceAuth {
  userEmail: string;
  displayName: string;
  accessToken: string;
  messagesTotal?: number;
  threadsTotal?: number;
  connectedAt: string;
}

export interface LiveGmailMessageSummary {
  id: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
}

export interface LiveCalendarEventSummary {
  id: string;
  summary: string;
  start: string;
  htmlLink: string;
}

onAuthStateChanged(auth, (user) => {
  if (!user && !inMemoryAccessToken) {
    inMemoryUserProfile = null;
  }
});

export function getStoredWorkspaceAuth(): StoredWorkspaceAuth | null {
  return inMemoryUserProfile;
}

/**
 * Verifies a Google OAuth 2.0 Access Token live against Google's Gmail & OAuth2 APIs.
 * Throws an error if the token is invalid, expired, or lacks Gmail/Calendar permissions.
 */
export async function verifyGoogleAccessTokenLive(
  accessToken: string
): Promise<{
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}> {
  const cleanToken = (accessToken || '').trim();
  if (!cleanToken) {
    throw new Error('Missing Google OAuth 2.0 access token.');
  }

  const gmailRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    }
  );

  if (gmailRes.ok) {
    const profile = await gmailRes.json();
    return {
      emailAddress: profile.emailAddress,
      messagesTotal: Number(profile.messagesTotal) || 0,
      threadsTotal: Number(profile.threadsTotal) || 0,
    };
  }

  // Fallback check against Google OAuth2 userinfo if only Calendar scope was granted
  const userInfoRes = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    }
  );

  if (userInfoRes.ok) {
    const info = await userInfoRes.json();
    if (info?.email) {
      return {
        emailAddress: info.email,
        messagesTotal: 0,
        threadsTotal: 0,
      };
    }
  }

  const errBody = await gmailRes.json().catch(() => ({}));
  throw new Error(
    errBody?.error?.message ||
      `Google API rejected OAuth token (HTTP ${gmailRes.status}). Please sign in with Google OAuth or provide a valid ya29... access token.`
  );
}

const CUSTOM_GOOGLE_CLIENT_ID_STORAGE_KEY = 'atelier_custom_google_client_id';

export function getCustomGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(CUSTOM_GOOGLE_CLIENT_ID_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (envId && String(envId).trim()) return String(envId).trim();
  return '';
}

export function setCustomGoogleClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    const cleaned = (clientId || '').trim();
    if (cleaned) {
      localStorage.setItem(CUSTOM_GOOGLE_CLIENT_ID_STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(CUSTOM_GOOGLE_CLIENT_ID_STORAGE_KEY);
    }
  }
}

async function loadGoogleIdentityServicesScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).google?.accounts?.oauth2) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services script.'))
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services script.'));
    document.head.appendChild(script);
  });
}

async function signInWithGoogleIdentityServicesPopup(
  clientId: string
): Promise<string> {
  await loadGoogleIdentityServicesScript();
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google Identity Services OAuth2 client failed to initialize.');
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: SCOPES.join(' '),
      prompt: 'select_account consent',
      callback: (response: any) => {
        if (response?.error) {
          reject(
            new Error(
              `Google OAuth error (${response.error}): ${
                response.error_description ||
                'Ensure your Render URL is added under Authorized JavaScript origins in Google Cloud Console.'
              }`
            )
          );
          return;
        }
        if (!response?.access_token) {
          reject(new Error('No access_token returned from Google OAuth popup.'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (err: any) => {
        reject(
          new Error(
            err?.message ||
              'Google OAuth popup closed or blocked by the browser.'
          )
        );
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account consent' });
  });
}

/**
 * Launches the real Google OAuth 2.0 Popup chooser and verifies the token live against Gmail API.
 * Supports:
 * 1. Direct OAuth 2.0 Access Token (ya29...)
 * 2. Custom Google OAuth Client ID (via Google Identity Services — ideal for Render / custom domains)
 * 3. Default Firebase Google Auth Popup (with automatic Render domain diagnostic message)
 */
export async function connectGoogleWorkspace(
  directOAuthAccessToken?: string,
  overrideClientId?: string
): Promise<StoredWorkspaceAuth> {
  // 1. If user pasted a real Google OAuth 2.0 access token (ya29....), verify it live against Google's servers
  if (directOAuthAccessToken && directOAuthAccessToken.trim().length > 0) {
    const cleanToken = directOAuthAccessToken.trim();
    const verified = await verifyGoogleAccessTokenLive(cleanToken);
    const stored: StoredWorkspaceAuth = {
      userEmail: verified.emailAddress,
      displayName: verified.emailAddress.split('@')[0],
      accessToken: cleanToken,
      messagesTotal: verified.messagesTotal,
      threadsTotal: verified.threadsTotal,
      connectedAt: new Date().toISOString(),
    };
    inMemoryAccessToken = cleanToken;
    inMemoryUserProfile = stored;
    return stored;
  }

  // 2. If a custom Google OAuth Client ID is configured (for Render or custom domains), use Google Identity Services directly
  const customClientId = (overrideClientId || getCustomGoogleClientId()).trim();
  if (customClientId) {
    setCustomGoogleClientId(customClientId);
    const accessToken =
      await signInWithGoogleIdentityServicesPopup(customClientId);
    const verified = await verifyGoogleAccessTokenLive(accessToken);
    const stored: StoredWorkspaceAuth = {
      userEmail: verified.emailAddress,
      displayName: verified.emailAddress.split('@')[0],
      accessToken,
      messagesTotal: verified.messagesTotal,
      threadsTotal: verified.threadsTotal,
      connectedAt: new Date().toISOString(),
    };
    inMemoryAccessToken = accessToken;
    inMemoryUserProfile = stored;
    return stored;
  }

  // 3. Otherwise launch Google OAuth Account Selector Popup via Firebase Auth
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error(
        'Google Sign-In did not return an OAuth access token. Please grant Gmail & Calendar permissions in the Google consent popup.'
      );
    }

    const verified = await verifyGoogleAccessTokenLive(accessToken);

    const stored: StoredWorkspaceAuth = {
      userEmail: verified.emailAddress || result.user.email || '',
      displayName:
        result.user.displayName ||
        verified.emailAddress.split('@')[0] ||
        'User',
      accessToken,
      messagesTotal: verified.messagesTotal,
      threadsTotal: verified.threadsTotal,
      connectedAt: new Date().toISOString(),
    };

    inMemoryAccessToken = accessToken;
    inMemoryUserProfile = stored;
    return stored;
  } catch (err: any) {
    const host =
      typeof window !== 'undefined' ? window.location.hostname : 'your-render-domain.onrender.com';
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://your-render-domain.onrender.com';

    if (
      err?.code === 'auth/unauthorized-domain' ||
      String(err?.message || '').includes('unauthorized-domain')
    ) {
      throw new Error(
        `Domain "${host}" is not authorized in the default AI Studio Firebase project. To sign in on Render: paste your own Google OAuth Client ID (with "${origin}" added to Authorized JavaScript origins in Google Cloud Console) in the Render / Custom Domain box below, or use Option 3 (OAuth Access Token).`
      );
    }
    throw err;
  }
}

/**
 * Fetches live recent messages from the user's connected Gmail inbox to prove real connectivity.
 */
export async function fetchLiveGmailMessages(
  accessToken: string,
  maxResults = 4
): Promise<LiveGmailMessageSummary[]> {
  const cleanToken = (accessToken || inMemoryAccessToken || '').trim();
  if (!cleanToken) {
    throw new Error('Not authenticated with Gmail.');
  }

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${cleanToken}` },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Failed to list Gmail messages (${listRes.status})`
    );
  }

  const listData = await listRes.json();
  const messages: { id: string }[] = Array.isArray(listData?.messages)
    ? listData.messages
    : [];

  const details = await Promise.all(
    messages.map(async (msg) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${cleanToken}` },
        }
      );
      if (!detailRes.ok) return null;
      const d = await detailRes.json();
      const headers: { name: string; value: string }[] =
        d?.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
          ?.value || '';
      return {
        id: d.id,
        snippet: d.snippet || '',
        subject: getHeader('Subject') || '(No Subject)',
        from: getHeader('From') || 'Unknown Sender',
        date: getHeader('Date') || '',
      };
    })
  );

  return details.filter((item): item is LiveGmailMessageSummary =>
    Boolean(item)
  );
}

/**
 * Fetches live upcoming events from the user's primary Google Calendar.
 */
export async function fetchLiveCalendarEvents(
  accessToken: string,
  maxResults = 4
): Promise<LiveCalendarEventSummary[]> {
  const cleanToken = (accessToken || inMemoryAccessToken || '').trim();
  if (!cleanToken) {
    throw new Error('Not authenticated with Google Calendar.');
  }

  const nowIso = encodeURIComponent(new Date().toISOString());
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&singleEvents=true&orderBy=startTime&timeMin=${nowIso}`,
    {
      headers: { Authorization: `Bearer ${cleanToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ||
        `Failed to fetch Google Calendar events (${res.status})`
    );
  }

  const data = await res.json();
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  return items.map((ev) => ({
    id: ev.id,
    summary: ev.summary || '(Untitled Event)',
    start: ev.start?.dateTime || ev.start?.date || '',
    htmlLink: ev.htmlLink || 'https://calendar.google.com',
  }));
}

export async function disconnectGoogleWorkspace(): Promise<void> {
  try {
    await auth.signOut();
  } catch {
    // ignore signOut errors
  }
  inMemoryAccessToken = null;
  inMemoryUserProfile = null;
}

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmailMessage(params: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string; threadId?: string }> {
  const cleanToken = (params.accessToken || inMemoryAccessToken || '').trim();
  if (!cleanToken) {
    throw new Error(
      'Gmail is not connected with a valid Google OAuth token. Please sign in with Google first.'
    );
  }

  const mimeMessage = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    params.body,
  ].join('\r\n');

  const raw = encodeBase64Url(mimeMessage);

  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Failed to send Gmail message (${res.status})`
    );
  }

  return res.json();
}

export async function createCalendarShowingEvent(params: {
  accessToken: string;
  summary: string;
  description: string;
  startIso: string;
  endIso: string;
  attendeeEmail?: string;
  attendeeEmails?: string[];
  calendarId?: string;
}): Promise<{ id: string; htmlLink: string }> {
  const cleanToken = (params.accessToken || inMemoryAccessToken || '').trim();
  if (!cleanToken) {
    throw new Error(
      'Google Calendar is not connected with a valid Google OAuth token. Please sign in with Google first.'
    );
  }

  const eventPayload: Record<string, any> = {
    summary: params.summary,
    description: params.description,
    start: { dateTime: params.startIso },
    end: { dateTime: params.endIso },
  };

  const allEmails = Array.from(
    new Set(
      [
        ...(params.attendeeEmail ? [params.attendeeEmail] : []),
        ...(Array.isArray(params.attendeeEmails) ? params.attendeeEmails : []),
      ]
        .map((e) => e.trim())
        .filter((e) => e.includes('@'))
    )
  );

  if (allEmails.length > 0) {
    eventPayload.attendees = allEmails.map((email) => ({ email }));
  }

  const targetCal = encodeURIComponent(params.calendarId?.trim() || 'primary');
  let res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    }
  );

  // If custom calendarId wasn't directly writable by this token, fall back to 'primary' with the human agent as attendee
  if (!res.ok && targetCal !== 'primary') {
    res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    );
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `Failed to create Google Calendar event (${res.status})`
    );
  }

  return res.json();
}

/**
 * Fetches live Gmail messages exchanged with a specific lead email address (from:lead OR to:lead)
 * when Gmail OAuth is connected, used by the "Analyze with AI" CRM feature.
 */
export async function fetchGmailMessagesForLead(
  accessToken: string,
  leadEmail: string,
  maxResults = 5
): Promise<LiveGmailMessageSummary[]> {
  const cleanToken = (accessToken || inMemoryAccessToken || '').trim();
  const cleanEmail = (leadEmail || '').trim();
  if (!cleanToken || !cleanEmail || !cleanEmail.includes('@')) {
    return [];
  }

  try {
    const q = encodeURIComponent(`from:${cleanEmail} OR to:${cleanEmail}`);
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${q}`,
      {
        headers: { Authorization: `Bearer ${cleanToken}` },
      }
    );

    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const messages: { id: string }[] = Array.isArray(listData?.messages)
      ? listData.messages
      : [];

    const details = await Promise.all(
      messages.map(async (msg) => {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${cleanToken}` },
          }
        );
        if (!detailRes.ok) return null;
        const d = await detailRes.json();
        const headers: { name: string; value: string }[] =
          d?.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
            ?.value || '';
        return {
          id: d.id,
          snippet: d.snippet || '',
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From') || 'Unknown Sender',
          date: getHeader('Date') || '',
        };
      })
    );

    return details.filter((item): item is LiveGmailMessageSummary =>
      Boolean(item)
    );
  } catch {
    return [];
  }
}

export interface LiveCalendarConflictEvent {
  id: string;
  summary: string;
  startIso: string;
  endIso: string;
  htmlLink: string;
  calendarId: string;
}

/**
 * Queries the assigned agent's connected Google Calendar live for any events overlapping [startIso, endIso).
 */
export async function checkGoogleCalendarConflicts(params: {
  accessToken?: string | null;
  calendarId?: string;
  startIso: string;
  endIso: string;
}): Promise<{
  checkedLive: boolean;
  conflicts: LiveCalendarConflictEvent[];
}> {
  const cleanToken = (params.accessToken || inMemoryAccessToken || '').trim();
  if (!cleanToken) {
    return { checkedLive: false, conflicts: [] };
  }

  const reqStartMs = new Date(params.startIso).getTime();
  const reqEndMs = new Date(params.endIso).getTime();
  if (isNaN(reqStartMs) || isNaN(reqEndMs) || reqEndMs <= reqStartMs) {
    return { checkedLive: false, conflicts: [] };
  }

  // Query a window around the proposed slot (±12 hours) to ensure all overlapping events are captured
  const timeMin = encodeURIComponent(
    new Date(reqStartMs - 12 * 3600 * 1000).toISOString()
  );
  const timeMax = encodeURIComponent(
    new Date(reqEndMs + 12 * 3600 * 1000).toISOString()
  );
  const targetCalId = params.calendarId?.trim() || 'primary';
  const encodedCal = encodeURIComponent(targetCalId);

  try {
    let res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}`,
      {
        headers: { Authorization: `Bearer ${cleanToken}` },
      }
    );

    let effectiveCalLabel = targetCalId;
    if (!res.ok && encodedCal !== 'primary') {
      effectiveCalLabel = 'primary';
      res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}`,
        {
          headers: { Authorization: `Bearer ${cleanToken}` },
        }
      );
    }

    if (!res.ok) {
      return { checkedLive: false, conflicts: [] };
    }

    const data = await res.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    const conflicts: LiveCalendarConflictEvent[] = [];

    for (const ev of items) {
      if (ev.status === 'cancelled') continue;
      // Only consider timed events (or all-day events if they include dateTime)
      const evStartRaw = ev.start?.dateTime;
      const evEndRaw = ev.end?.dateTime;
      if (!evStartRaw || !evEndRaw) continue;

      const evStartMs = new Date(evStartRaw).getTime();
      const evEndMs = new Date(evEndRaw).getTime();
      if (isNaN(evStartMs) || isNaN(evEndMs)) continue;

      // Overlap check: [evStartMs, evEndMs) intersects [reqStartMs, reqEndMs)
      if (evStartMs < reqEndMs && evEndMs > reqStartMs) {
        conflicts.push({
          id: ev.id || `gcal-${evStartMs}`,
          summary: ev.summary || 'Busy / Scheduled Google Calendar Event',
          startIso: new Date(evStartMs).toISOString(),
          endIso: new Date(evEndMs).toISOString(),
          htmlLink: ev.htmlLink || 'https://calendar.google.com',
          calendarId: effectiveCalLabel,
        });
      }
    }

    return { checkedLive: true, conflicts };
  } catch {
    return { checkedLive: false, conflicts: [] };
  }
}


