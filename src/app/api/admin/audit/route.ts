import { NextRequest, NextResponse } from 'next/server';
import { findSessionByToken, findUserById, getActivityLogs, ActivityLogEntry } from '@/lib/auth/store';
import { getPermissionsForRole } from '@/lib/auth/permissions';

// Helper to get auth user from request
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

// GET /api/admin/audit - Get audit logs with filtering and statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const permissions = getPermissionsForRole(user.role);
    if (!permissions.view_audit_logs && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeStats = searchParams.get('stats') === 'true';

    // Get activity logs
    let logs = await getActivityLogs();

    // Apply filters
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    if (category) {
      logs = logs.filter(log => log.category === category);
    }
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = logs.length;

    // Apply pagination
    const paginatedLogs = logs.slice(offset, offset + limit);

    // Calculate statistics if requested
    let statistics = null;
    if (includeStats) {
      statistics = calculateAuditStatistics(logs);
    }

    return NextResponse.json({
      success: true,
      logs: paginatedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      ...(statistics && { statistics }),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// Calculate statistics from audit logs
function calculateAuditStatistics(logs: ActivityLogEntry[]) {
  // Stats by action
  const byAction: Record<string, number> = {};
  logs.forEach(log => {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  });

  // Stats by category
  const byCategory: Record<string, number> = {};
  logs.forEach(log => {
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
  });

  // Stats by user (top 10 most active)
  const byUser: Record<string, { count: number; name: string }> = {};
  logs.forEach(log => {
    if (!byUser[log.userId]) {
      byUser[log.userId] = { count: 0, name: log.userName };
    }
    byUser[log.userId].count++;
  });

  const topUsers = Object.entries(byUser)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([userId, data]) => ({
      userId,
      userName: data.name,
      count: data.count,
    }));

  // Stats by severity (if available)
  const bySeverity: Record<string, number> = {
    INFO: 0,
    WARNING: 0,
    ERROR: 0,
    CRITICAL: 0,
  };

  logs.forEach(log => {
    // Determine severity based on action type
    if (log.action.includes('FAILED') || !log.success) {
      bySeverity.ERROR++;
    } else if (log.action.includes('DELETE') || log.action.includes('DISABLE')) {
      bySeverity.WARNING++;
    } else if (log.action.includes('CRITICAL')) {
      bySeverity.CRITICAL++;
    } else {
      bySeverity.INFO++;
    }
  });

  // Success rate
  const successful = logs.filter(log => log.success !== false).length;
  const failed = logs.filter(log => log.success === false).length;
  const successRate = logs.length > 0 ? (successful / logs.length) * 100 : 100;

  // Activity over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activityByDay: Record<string, number> = {};
  logs
    .filter(log => new Date(log.timestamp) >= thirtyDaysAgo)
    .forEach(log => {
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

  return {
    total: logs.length,
    byAction,
    byCategory,
    bySeverity,
    topUsers,
    successRate: Math.round(successRate * 100) / 100,
    successful,
    failed,
    activityByDay,
    summary: {
      totalToday: logs.filter(log => {
        const today = new Date().toISOString().split('T')[0];
        return log.timestamp.startsWith(today);
      }).length,
      totalThisWeek: logs.filter(log => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(log.timestamp) >= weekAgo;
      }).length,
      totalThisMonth: logs.filter(log => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(log.timestamp) >= monthAgo;
      }).length,
    },
  };
}

// Extended ActivityLogEntry for typing
interface ActivityLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  category: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}
