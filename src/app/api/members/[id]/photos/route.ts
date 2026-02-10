import { NextRequest, NextResponse } from 'next/server';
import { createMemberPhoto, setProfilePhoto } from '@/lib/db/images';
import { findSessionByToken, findUserById } from '@/lib/auth/db-store';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import { normalizeMemberId } from '@/lib/utils';
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IS_REPLIT = !!process.env.REPL_ID;
const MAX_FILE_SIZE = IS_REPLIT ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
const THUMBNAIL_MAX_SIZE = IS_REPLIT ? 150 : 200;
const THUMBNAIL_QUALITY = IS_REPLIT ? 70 : 80;
const DAILY_UPLOAD_QUOTA = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VALID_CATEGORIES = ['profile', 'memory', 'document', 'historical'];

if (IS_REPLIT) {
  sharp.concurrency(1);
}

interface UploadRequest {
  imageData: string;
  category?: 'profile' | 'memory' | 'document' | 'historical';
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  taggedMemberIds?: string[];
  folderId?: string;
  setAsProfile?: boolean;
}

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

function validateBase64Image(dataUrl: string): { valid: boolean; error?: string; type?: string; size?: number } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: 'Invalid image format. Must be a base64 data URL.' };
  }

  const mimeType = match[1];
  const base64Data = match[2];

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid image type: ${mimeType}. Allowed types: ${ALLOWED_TYPES.join(', ')}` };
  }

  const size = Math.ceil((base64Data.length * 3) / 4);
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }

  return { valid: true, type: mimeType, size };
}

function sanitizeString(str: string | undefined): string | undefined {
  if (!str) return undefined;
  return str.replace(/<[^>]*>/g, '').trim();
}

async function generateThumbnail(imageData: string, maxSize: number = THUMBNAIL_MAX_SIZE): Promise<string> {
  try {
    const match = imageData.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!match) {
      console.log('Invalid image data URL for thumbnail generation');
      return imageData;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let outputFormat: 'jpeg' | 'png' | 'webp' = 'jpeg';
    if (mimeType === 'image/png') outputFormat = 'png';
    else if (mimeType === 'image/webp') outputFormat = 'webp';

    let thumbnailBuffer: Buffer;

    if (outputFormat === 'jpeg') {
      thumbnailBuffer = await sharp(buffer)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
    } else if (outputFormat === 'png') {
      thumbnailBuffer = await sharp(buffer)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
    } else {
      thumbnailBuffer = await sharp(buffer)
        .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
    }

    const thumbnailBase64 = thumbnailBuffer.toString('base64');
    return `data:image/${outputFormat};base64,${thumbnailBase64}`;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return imageData;
  }
}

async function checkDailyQuota(userId: string, memberId: string): Promise<{ allowed: boolean; count: number }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const count = await prisma.memberPhoto.count({
    where: {
      uploadedBy: userId,
      memberId: memberId,
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
  });

  return {
    allowed: count < DAILY_UPLOAD_QUOTA,
    count,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', errorAr: 'غير مصرح' },
        { status: 401 }
      );
    }

    const memberId = normalizeMemberId(params.id) || params.id;

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    if (!isAdmin && user.linkedMemberId !== memberId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You can only upload photos to your own profile',
          errorAr: 'يمكنك فقط رفع الصور إلى ملفك الشخصي'
        },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      const quotaCheck = await checkDailyQuota(user.id, memberId);
      if (!quotaCheck.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Daily upload limit reached (${DAILY_UPLOAD_QUOTA} photos/day). You have uploaded ${quotaCheck.count} photos today.`,
            errorAr: `تم الوصول إلى الحد اليومي (${DAILY_UPLOAD_QUOTA} صور/يوم). لقد رفعت ${quotaCheck.count} صور اليوم.`
          },
          { status: 429 }
        );
      }
    }

    const body = await request.json() as UploadRequest;

    if (!body.imageData) {
      return NextResponse.json(
        { success: false, error: 'Image data is required', errorAr: 'بيانات الصورة مطلوبة' },
        { status: 400 }
      );
    }

    const imageValidation = validateBase64Image(body.imageData);
    if (!imageValidation.valid) {
      return NextResponse.json(
        { success: false, error: imageValidation.error, errorAr: 'صورة غير صالحة' },
        { status: 400 }
      );
    }

    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, errorAr: 'تصنيف غير صالح' },
        { status: 400 }
      );
    }

    if (body.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (body.year < 1800 || body.year > currentYear) {
        return NextResponse.json(
          { success: false, error: `Year must be between 1800 and ${currentYear}`, errorAr: 'السنة غير صالحة' },
          { status: 400 }
        );
      }
    }

    const thumbnailData = await generateThumbnail(body.imageData);

    const photo = await createMemberPhoto({
      imageData: body.imageData,
      thumbnailData,
      category: body.category || 'memory',
      title: sanitizeString(body.title),
      titleAr: sanitizeString(body.titleAr),
      caption: sanitizeString(body.caption),
      captionAr: sanitizeString(body.captionAr),
      year: body.year,
      memberId,
      taggedMemberIds: body.taggedMemberIds ? JSON.stringify(body.taggedMemberIds) : undefined,
      folderId: body.folderId,
      uploadedBy: user.id,
      uploadedByName: user.nameArabic || user.nameEnglish || user.email,
      isProfilePhoto: false,
      isPublic: true,
    });

    if (body.setAsProfile) {
      await setProfilePhoto(memberId, photo.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      messageAr: 'تم رفع الصورة بنجاح',
      photo: {
        id: photo.id,
        category: photo.category,
        title: photo.title,
        isProfilePhoto: body.setAsProfile || false,
        createdAt: photo.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading member photo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload photo', errorAr: 'فشل في رفع الصورة' },
      { status: 500 }
    );
  }
}
