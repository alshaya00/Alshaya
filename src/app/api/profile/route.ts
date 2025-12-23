import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSessionByToken, findUserById, updateUser } from '@/lib/auth/store';

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

// Sanitize string input
function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

// GET /api/profile - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    // Get linked family member if exists
    let linkedMember = null;
    if (user.linkedMemberId) {
      try {
        linkedMember = await prisma.familyMember.findUnique({
          where: { id: user.linkedMemberId },
          select: {
            id: true,
            firstName: true,
            fullNameAr: true,
            fullNameEn: true,
            phone: true,
            email: true,
            city: true,
            birthYear: true,
            photoUrl: true,
            biography: true,
            occupation: true,
            generation: true,
            branch: true,
            status: true,
          },
        });
      } catch (err) {
        console.log('Error fetching linked member:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nameArabic: user.nameArabic,
          nameEnglish: user.nameEnglish,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          role: user.role,
          linkedMemberId: user.linkedMemberId,
          twoFactorEnabled: user.twoFactorEnabled || false,
        },
        linkedMember,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch profile', messageAr: 'فشل في تحميل الملف الشخصي' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      nameArabic,
      nameEnglish,
      phone,
      avatarUrl,
      // For linked member updates
      biography,
      occupation,
      city,
      photoUrl,
    } = body;

    // Update user record
    const userUpdates: Record<string, string | null> = {};
    if (nameArabic !== undefined) userUpdates.nameArabic = sanitizeString(nameArabic);
    if (nameEnglish !== undefined) userUpdates.nameEnglish = sanitizeString(nameEnglish);
    if (phone !== undefined) userUpdates.phone = sanitizeString(phone);
    if (avatarUrl !== undefined) userUpdates.avatarUrl = avatarUrl;

    // Update user if there are changes
    if (Object.keys(userUpdates).length > 0) {
      await updateUser(user.id, userUpdates);
    }

    // Update linked family member if exists and there are member-specific updates
    let updatedMember = null;
    if (user.linkedMemberId) {
      const memberUpdates: Record<string, string | null> = {};
      if (biography !== undefined) memberUpdates.biography = sanitizeString(biography);
      if (occupation !== undefined) memberUpdates.occupation = sanitizeString(occupation);
      if (city !== undefined) memberUpdates.city = sanitizeString(city);
      if (phone !== undefined) memberUpdates.phone = sanitizeString(phone);
      if (photoUrl !== undefined) memberUpdates.photoUrl = photoUrl;

      if (Object.keys(memberUpdates).length > 0) {
        try {
          updatedMember = await prisma.familyMember.update({
            where: { id: user.linkedMemberId },
            data: memberUpdates,
            select: {
              id: true,
              firstName: true,
              fullNameAr: true,
              phone: true,
              city: true,
              photoUrl: true,
              biography: true,
              occupation: true,
            },
          });
        } catch (err) {
          console.log('Error updating linked member:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      messageAr: 'تم تحديث الملف الشخصي بنجاح',
      data: {
        userUpdates,
        linkedMember: updatedMember,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile', messageAr: 'فشل في تحديث الملف الشخصي' },
      { status: 500 }
    );
  }
}

// POST /api/profile/photo - Upload profile photo
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', messageAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { photoData } = body; // Base64 encoded image

    if (!photoData) {
      return NextResponse.json(
        { success: false, message: 'No photo data provided', messageAr: 'لم يتم توفير صورة' },
        { status: 400 }
      );
    }

    // Validate base64 image format
    const base64Pattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
    if (!base64Pattern.test(photoData)) {
      return NextResponse.json(
        { success: false, message: 'Invalid image format', messageAr: 'صيغة الصورة غير صالحة' },
        { status: 400 }
      );
    }

    // Check image size (limit to 2MB base64)
    const base64Size = photoData.length * 0.75; // Approximate decoded size
    if (base64Size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Image too large (max 2MB)', messageAr: 'الصورة كبيرة جداً (الحد 2 ميجابايت)' },
        { status: 400 }
      );
    }

    // Update user avatar
    await updateUser(user.id, { avatarUrl: photoData });

    // Also update linked member if exists
    if (user.linkedMemberId) {
      try {
        await prisma.familyMember.update({
          where: { id: user.linkedMemberId },
          data: { photoUrl: photoData },
        });
      } catch (err) {
        console.log('Error updating linked member photo:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      messageAr: 'تم رفع الصورة بنجاح',
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload photo', messageAr: 'فشل في رفع الصورة' },
      { status: 500 }
    );
  }
}
