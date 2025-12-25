import { NextRequest, NextResponse } from 'next/server';
import { broadcastService } from '@/lib/services/broadcast';
import { findSessionByToken, findUserById } from '@/lib/auth/store';
import { logger } from '@/lib/logging';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';

// Helper to get authenticated user from request
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  const session = await findSessionByToken(token);
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user || user.status !== 'ACTIVE') return null;

  return user;
}

// POST /api/broadcasts/[id]/send - Send a broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only ADMIN and SUPER_ADMIN can send broadcasts
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      logger.security('Unauthorized broadcast send attempt', 'high', {
        userId: user.id,
        userRole: user.role,
        broadcastId: params.id,
      });
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to send broadcasts' },
        { status: 403 }
      );
    }

    // Rate limiting for broadcast sending (more restrictive)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateCheck = checkRateLimit(`broadcast-send:${user.id}`, {
      ...RATE_LIMITS.admin,
      maxRequests: 5, // Only 5 broadcast sends per hour
      windowMs: 60 * 60 * 1000,
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before sending another broadcast.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        }
      );
    }

    const { id } = params;
    const result = await broadcastService.sendBroadcast(id);

    if (result.success) {
      logger.info('Broadcast sent successfully', {
        broadcastId: id,
        userId: user.id,
        sentCount: result.sentCount,
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `Broadcast sent successfully to ${result.sentCount} recipients`,
      });
    } else {
      logger.warn('Broadcast send failed', {
        broadcastId: id,
        userId: user.id,
        errors: result.errors,
      });

      return NextResponse.json({
        success: false,
        data: result,
        error: result.errors?.join(', ') || 'Failed to send broadcast',
      }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error sending broadcast:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to send broadcast';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
