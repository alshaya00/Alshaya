import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthorizationUrl,
  generateStateToken,
  storeOAuthState,
  isProviderConfigured,
  OAuthProvider,
} from '@/lib/auth/oauth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerParam } = await params;
    const provider = providerParam as OAuthProvider;

    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid OAuth provider',
          messageAr: 'مزود OAuth غير صالح',
        },
        { status: 400 }
      );
    }

    // Check if provider is configured
    if (!isProviderConfigured(provider)) {
      return NextResponse.json(
        {
          success: false,
          message: `${provider} OAuth is not configured`,
          messageAr: `مزود ${provider} غير مهيأ`,
        },
        { status: 400 }
      );
    }

    // Get redirect URL from query params
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';

    // Generate state token
    const state = generateStateToken();
    storeOAuthState(state, provider, redirectTo);

    // Build callback URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/oauth/callback`;

    // Get authorization URL
    const authUrl = getAuthorizationUrl(provider, state, redirectUri);

    // Redirect to provider
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);

    // Redirect to login with error
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }
}
