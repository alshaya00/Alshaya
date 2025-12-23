import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import {
  validateOAuthState,
  exchangeCodeForTokens,
  getUserInfo,
} from '@/lib/auth/oauth';
import {
  findUserByEmail,
  createUser,
  createSession,
  updateUser,
  logActivity,
} from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

// Generate a cryptographically secure random password for OAuth users
// This password is never used since OAuth users authenticate via provider
function generateSecureOAuthPassword(): string {
  // Generate 32 random bytes and encode as base64
  return `oauth_${randomBytes(32).toString('base64url')}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
    }

    // Validate state
    const stateData = validateOAuthState(state);
    if (!stateData) {
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_invalid_state`);
    }

    const { provider, redirectTo } = stateData;

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/auth/oauth/callback`;
    const tokens = await exchangeCodeForTokens(provider, code, redirectUri);

    // Get user info
    const userInfo = await getUserInfo(provider, tokens.accessToken);

    if (!userInfo.email) {
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_no_email`);
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if user exists
    let user = await findUserByEmail(userInfo.email);

    if (!user) {
      // Create new user with secure random password
      // OAuth users don't use password auth - this is just to satisfy the schema
      user = await createUser({
        email: userInfo.email,
        password: generateSecureOAuthPassword(),
        nameArabic: userInfo.name,
        nameEnglish: userInfo.name,
        role: 'MEMBER',
        status: 'ACTIVE', // Auto-activate OAuth users
      });

      // Mark email as verified (OAuth emails are verified by provider)
      await updateUser(user.id, {
        emailVerifiedAt: new Date(),
        avatarUrl: userInfo.picture,
      });

      await logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.nameArabic,
        action: 'REGISTER',
        category: 'AUTH',
        details: { provider, oauthId: userInfo.id },
        ipAddress,
        userAgent,
        success: true,
      });
    } else {
      // Update existing user
      if (userInfo.picture && !user.avatarUrl) {
        await updateUser(user.id, { avatarUrl: userInfo.picture });
      }
    }

    // Check user status
    if (user.status === 'PENDING') {
      return NextResponse.redirect(`${baseUrl}/login?error=account_pending`);
    }

    if (user.status === 'DISABLED') {
      return NextResponse.redirect(`${baseUrl}/login?error=account_disabled`);
    }

    // Create session
    const session = await createSession(user.id, true, ipAddress, userAgent);

    // Update last login
    await updateUser(user.id, { lastLoginAt: new Date() });

    // Log login
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userName: user.nameArabic,
      action: 'LOGIN',
      category: 'AUTH',
      details: { provider, oauthId: userInfo.id },
      ipAddress,
      userAgent,
      success: true,
    });

    // Build user data for client
    const userData = {
      id: user.id,
      email: user.email,
      nameArabic: user.nameArabic,
      nameEnglish: user.nameEnglish,
      role: user.role,
      status: user.status,
      linkedMemberId: user.linkedMemberId,
      assignedBranch: user.assignedBranch,
      permissions: getPermissionsForRole(user.role),
    };

    // Create a temporary token to pass user data to client
    const sessionData = encodeURIComponent(JSON.stringify({
      user: userData,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    }));

    // Redirect to success page with session data
    return NextResponse.redirect(`${baseUrl}/oauth-success?data=${sessionData}&redirect=${encodeURIComponent(redirectTo || '/')}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }
}
