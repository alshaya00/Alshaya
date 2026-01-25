import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionFromRequest } from '@/lib/auth/session';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { logAuditToDb } from '@/lib/audit';

interface MigrationTask {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  canRevert: boolean;
  affectedRecords?: number;
}

interface MigrationLog {
  id: string;
  taskId: string;
  taskName: string;
  action: 'execute';
  status: 'success' | 'failed';
  affectedRecords: number;
  executedAt: string;
  executedBy: string;
  details?: string;
}

const migrationTasks: MigrationTask[] = [
  {
    id: 'activate-pending-users',
    name: 'تفعيل المستخدمين المعلقين',
    nameEn: 'Activate Pending Users',
    description: 'تغيير حالة جميع المستخدمين المعلقين إلى نشط',
    status: 'pending',
    canRevert: false,
  },
  {
    id: 'migrate-access-requests',
    name: 'ترحيل طلبات الانضمام',
    nameEn: 'Migrate Access Requests',
    description: 'نقل بيانات طلبات الانضمام المعلقة إلى جدول المستخدمين',
    status: 'pending',
    canRevert: false,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(session.user.role);
    if (!permissions.manage_users && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const pendingUsers = await prisma.user.count({ where: { status: 'PENDING' } });
    const pendingRequests = await prisma.accessRequest.count({ where: { status: 'PENDING' } });

    const tasks = migrationTasks.map(task => {
      if (task.id === 'activate-pending-users') {
        return {
          ...task,
          status: pendingUsers === 0 ? 'completed' as const : 'pending' as const,
          affectedRecords: pendingUsers,
        };
      }
      if (task.id === 'migrate-access-requests') {
        return {
          ...task,
          status: pendingRequests === 0 ? 'completed' as const : 'pending' as const,
          affectedRecords: pendingRequests,
        };
      }
      return task;
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: 'DATA_MIGRATION_EXECUTE',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const logs: MigrationLog[] = auditLogs.map(log => ({
      id: log.id,
      taskId: (log.details as Record<string, string>)?.taskId || '',
      taskName: (log.details as Record<string, string>)?.taskName || '',
      action: 'execute',
      status: log.success ? 'success' : 'failed',
      affectedRecords: (log.details as Record<string, number>)?.affectedRecords || 0,
      executedAt: log.createdAt.toISOString(),
      executedBy: log.userName || '',
    }));

    return NextResponse.json({ success: true, tasks, logs });
  } catch (error) {
    console.error('Error loading migration data:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = getPermissionsForRole(session.user.role);
    if (!permissions.manage_users && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, taskId } = body;

    if (!action || !taskId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    let affectedRecords = 0;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    if (action === 'execute') {
      if (taskId === 'activate-pending-users') {
        const result = await prisma.user.updateMany({
          where: { status: 'PENDING' },
          data: { status: 'ACTIVE' },
        });
        affectedRecords = result.count;

        await logAuditToDb({
          action: 'DATA_MIGRATION_EXECUTE',
          severity: 'WARNING',
          userId: session.user.id,
          userName: session.user.email,
          userRole: session.user.role,
          targetType: 'USER',
          description: 'تفعيل المستخدمين المعلقين',
          details: { taskId, taskName: 'تفعيل المستخدمين المعلقين', affectedRecords },
          ipAddress,
          success: true,
        });
      }

      if (taskId === 'migrate-access-requests') {
        const pendingRequests = await prisma.accessRequest.findMany({
          where: { status: 'PENDING' },
        });

        for (const req of pendingRequests) {
          const existingUser = await prisma.user.findUnique({
            where: { email: req.email },
          });

          if (!existingUser && req.passwordHash) {
            await prisma.user.create({
              data: {
                email: req.email,
                passwordHash: req.passwordHash,
                nameArabic: req.nameArabic,
                nameEnglish: req.nameEnglish,
                phone: req.phone,
                role: 'USER',
                status: 'ACTIVE',
              },
            });
            affectedRecords++;
          }

          await prisma.accessRequest.update({
            where: { id: req.id },
            data: { status: 'APPROVED' },
          });
        }

        await logAuditToDb({
          action: 'DATA_MIGRATION_EXECUTE',
          severity: 'WARNING',
          userId: session.user.id,
          userName: session.user.email,
          userRole: session.user.role,
          targetType: 'ACCESS_REQUEST',
          description: 'ترحيل طلبات الانضمام',
          details: { taskId, taskName: 'ترحيل طلبات الانضمام', affectedRecords },
          ipAddress,
          success: true,
        });
      }

      return NextResponse.json({ success: true, affectedRecords });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
