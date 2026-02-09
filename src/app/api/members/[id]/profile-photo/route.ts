import { NextRequest, NextResponse } from 'next/server';
import { setProfilePhoto, getProfilePhoto, getMemberPhotoById } from '@/lib/db/images';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { getPermissionsForRole } from '@/lib/auth/permissions';
import { normalizeMemberId } from '@/lib/utils';
export const dynamic = "force-dynamic";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = normalizeMemberId(params.id) || params.id;
    const profilePhoto = await getProfilePhoto(memberId);

    if (!profilePhoto) {
      return NextResponse.json({ success: true, photo: null });
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: profilePhoto.id,
        thumbnailData: profilePhoto.thumbnailData || profilePhoto.imageData,
        imageData: profilePhoto.imageData,
      },
    });
  } catch (error) {
    console.error('Error fetching profile photo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile photo' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const memberId = normalizeMemberId(params.id) || params.id;
    const permissions = getPermissionsForRole(user.role);
    const isAdmin = permissions.manage_all_members || permissions.edit_any_member;
    const normalizedLinkedId = normalizeMemberId(user.linkedMemberId);
    const isOwner = normalizedLinkedId === memberId || user.linkedMemberId === memberId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'No permission', messageAr: 'لا تملك الصلاحية' },
        { status: 403 }
      );
    }

    const { photoId } = await request.json();

    if (!photoId) {
      return NextResponse.json(
        { success: false, message: 'Photo ID required', messageAr: 'معرف الصورة مطلوب' },
        { status: 400 }
      );
    }

    const photo = await getMemberPhotoById(photoId);
    if (!photo) {
      return NextResponse.json(
        { success: false, message: 'Photo not found', messageAr: 'الصورة غير موجودة' },
        { status: 404 }
      );
    }

    if (photo.memberId !== memberId) {
      return NextResponse.json(
        { success: false, message: 'Photo does not belong to this member', messageAr: 'هذه الصورة لا تخص هذا العضو' },
        { status: 403 }
      );
    }

    const result = await setProfilePhoto(memberId, photoId);

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Failed to set profile photo', messageAr: 'فشل تعيين صورة الملف الشخصي' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile photo updated successfully',
      messageAr: 'تم تحديث صورة الملف الشخصي بنجاح',
    });
  } catch (error) {
    console.error('Error setting profile photo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set profile photo' },
      { status: 500 }
    );
  }
}
