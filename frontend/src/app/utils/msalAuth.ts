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

export async function loginWithMicrosoft(): Promise<{ email: string; name: string }> {
  const instance = await getMsalInstance();

  const loginRequest: PopupRequest = {
    scopes: ['User.Read', 'openid', 'profile', 'email'],
    prompt: 'select_account',
    // Use the app origin as redirectUri — must match what's registered in Azure AD.
    // MSAL handles the auth code response in the popup and closes it automatically.
    redirectUri: window.location.origin,
  };

  try {
    const response = await instance.loginPopup(loginRequest);
    const account = response.account;

    if (!account) {
      throw new Error('No account information returned from Microsoft.');
    }

    const email =
      account.username ||
      (account.idTokenClaims as any)?.email ||
      (account.idTokenClaims as any)?.preferred_username;
    const name = account.name || (account.idTokenClaims as any)?.name || 'Outlook User';

    if (!email) {
      throw new Error('Could not retrieve email from Microsoft account.');
    }

    return { email, name };
  } catch (error: any) {
    console.error('Microsoft login error:', error);
    throw new Error(error?.message || 'Microsoft / Outlook Sign-In failed');
  }
}
