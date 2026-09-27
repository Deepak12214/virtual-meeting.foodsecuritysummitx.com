import { PublicClientApplication, Configuration, PopupRequest } from '@azure/msal-browser';

// Microsoft OAuth Configuration (Client ID can be configured via VITE_MICROSOFT_CLIENT_ID)
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '7d9dfe90-bc4e-45e8-816a-9d7e28a81e95';
const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    // How long this window waits for the popup to report back. It covers the user's
    // whole sign-in (account picker, password, MFA, consent), so MSAL's 60s default
    // is too short and would drop logins that finish late.
    popupBridgeTimeout: 5 * 60 * 1000,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

let isMsalInitialized = false;

async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!isMsalInitialized) {
    await msalInstance.initialize();
    isMsalInitialized = true;
  }
  return msalInstance;
}

/**
 * Opens the Microsoft sign-in popup and returns the signed ID token.
 * The backend verifies this token and reads the email/name from it — never
 * send user details from the client, as they can't be trusted.
 */
export async function loginWithMicrosoft(): Promise<string> {
  const instance = await getMsalInstance();

  const loginRequest: PopupRequest = {
    scopes: ['User.Read', 'openid', 'profile', 'email'],
    prompt: 'select_account',
    // Must match the redirect URI registered in Azure AD. When the popup lands
    // here, src/main.tsx runs the MSAL redirect bridge, which sends the response
    // back to this window and closes the popup.
    redirectUri: window.location.origin,
    // MSAL can't detect the user closing the popup (it only waits for a response),
    // so a new click must be able to replace a still-pending attempt instead of
    // failing with interaction_in_progress.
    overrideInteractionInProgress: true,
  };

  try {
    const response = await instance.loginPopup(loginRequest);

    if (!response.idToken) {
      throw new Error('No ID token returned from Microsoft.');
    }

    return response.idToken;
  } catch (error: any) {
    if (error?.errorCode === 'timed_out') {
      throw new Error('Microsoft sign-in timed out. Please try again.');
    }
    console.error('Microsoft login error:', error);
    throw new Error(error?.message || 'Microsoft / Outlook Sign-In failed');
  }
}
