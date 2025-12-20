// OAuth Provider Configuration
import crypto from 'crypto';

export type OAuthProvider = 'google' | 'github';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  nameArabic?: string;
  picture?: string;
  provider: OAuthProvider;
}

// Provider configurations
const providers: Record<OAuthProvider, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['email', 'profile'],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email', 'read:user'],
  },
};

// Check if a provider is configured
export function isProviderConfigured(provider: OAuthProvider): boolean {
  const config = providers[provider];
  return !!(config.clientId && config.clientSecret);
}

// Get configured providers
export function getConfiguredProviders(): OAuthProvider[] {
  return (['google', 'github'] as OAuthProvider[]).filter(isProviderConfigured);
}

// Generate state token for CSRF protection
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate authorization URL
export function getAuthorizationUrl(
  provider: OAuthProvider,
  state: string,
  redirectUri: string
): string {
  const config = providers[provider];

  if (!config.clientId) {
    throw new Error(`${provider} is not configured`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  // Google-specific parameters
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

// Exchange code for tokens
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const config = providers[provider];

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

// Get user info from provider
export async function getUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserInfo> {
  const config = providers[provider];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  // GitHub requires User-Agent
  if (provider === 'github') {
    headers['User-Agent'] = 'Al-Shaye-Family-Tree';
  }

  const response = await fetch(config.userInfoUrl, { headers });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();

  if (provider === 'google') {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      provider: 'google',
    };
  }

  if (provider === 'github') {
    // GitHub might not return email in profile, need separate call
    let email = data.email;

    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', { headers });
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((e: { primary: boolean }) => e.primary);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }

    return {
      id: String(data.id),
      email: email || '',
      name: data.name || data.login,
      picture: data.avatar_url,
      provider: 'github',
    };
  }

  throw new Error('Unknown provider');
}

// Store OAuth state in database or memory
const oauthStates: Map<string, { provider: OAuthProvider; expiresAt: Date; redirectTo?: string }> = new Map();

export function storeOAuthState(
  state: string,
  provider: OAuthProvider,
  redirectTo?: string
): void {
  // Clean up expired states
  const now = new Date();
  for (const [key, value] of oauthStates.entries()) {
    if (value.expiresAt < now) {
      oauthStates.delete(key);
    }
  }

  oauthStates.set(state, {
    provider,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    redirectTo,
  });
}

export function validateOAuthState(
  state: string
): { provider: OAuthProvider; redirectTo?: string } | null {
  const stored = oauthStates.get(state);

  if (!stored) {
    return null;
  }

  if (stored.expiresAt < new Date()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return { provider: stored.provider, redirectTo: stored.redirectTo };
}
