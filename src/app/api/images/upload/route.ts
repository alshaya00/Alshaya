import { NextRequest, NextResponse } from 'next/server';
import { createPendingImage, type CreatePendingImageInput } from '@/lib/db/images';
import sharp from 'sharp';
import { normalizeMemberId } from '@/lib/utils';
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Replit-compatible: Lower memory limits for constrained environments
const IS_REPLIT = !!process.env.REPL_ID;

// Maximum file size - lower on Replit to avoid memory issues
const MAX_IMAGE_SIZE = IS_REPLIT ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB on Replit, 5MB elsewhere
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

// Thumbnail settings - smaller on Replit
const THUMBNAIL_MAX_SIZE = IS_REPLIT ? 150 : 200;
const THUMBNAIL_QUALITY = IS_REPLIT ? 70 : 80;

// Sharp concurrency limit for memory management
if (IS_REPLIT) {
  sharp.concurrency(1); // Single-threaded to reduce memory usage
}

// Allowed media types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Image categories
const VALID_CATEGORIES = ['profile', 'memory', 'document', 'historical'];

interface UploadRequest {
  imageData: string; // Base64 encoded image
  category?: 'profile' | 'memory' | 'document' | 'historical';
  title?: string;
  titleAr?: string;
  caption?: string;
  captionAr?: string;
  year?: number;
  memberId?: string;
  memberName?: string;
  taggedMemberIds?: string[];
  folderId?: string;
  uploaderName: string;
  uploaderEmail?: string;
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function validateBase64Media(dataUrl: string): { valid: boolean; error?: string; type?: string; size?: number; isVideo?: boolean } {
  // Check if it's a valid data URL for image or video
  const match = dataUrl.match(/^data:((image|video)\/[a-zA-Z0-9]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: 'صيغة الملف غير صحيحة' };
  }

  const mimeType = match[1];
  const mediaType = match[2]; // 'image' or 'video'
  const base64Data = match[3];
  const isVideo = mediaType === 'video';

  // Check mime type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { valid: false, error: `صيغة غير مدعومة: ${mimeType}` };
  }

  // Calculate approximate file size
  const size = Math.ceil((base64Data.length * 3) / 4);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  
  if (size > maxSize) {
    const maxMB = maxSize / 1024 / 1024;
    return { valid: false, error: `حجم الملف كبير جداً. الحد الأقصى ${maxMB} ميجابايت` };
  }

  return { valid: true, type: mimeType, size, isVideo };
}

function sanitizeString(str: string | undefined): string | undefined {
  if (!str) return undefined;
  // Remove HTML tags and trim
  return str.replace(/<[^>]*>/g, '').trim();
}

// Generate a thumbnail using Sharp
async function generateThumbnail(imageData: string, maxSize: number = THUMBNAIL_MAX_SIZE): Promise<string> {
  try {
    // Extract base64 data and mime type from data URL
    const match = imageData.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!match) {
      console.log('Invalid image data URL for thumbnail generation');
      return imageData;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine output format based on input type
    let outputFormat: 'jpeg' | 'png' | 'webp' = 'jpeg';
    if (mimeType === 'image/png') outputFormat = 'png';
    else if (mimeType === 'image/webp') outputFormat = 'webp';

    // Generate thumbnail using Sharp
    let thumbnailBuffer: Buffer;

    if (outputFormat === 'jpeg') {
      thumbnailBuffer = await sharp(buffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
    } else if (outputFormat === 'png') {
      thumbnailBuffer = await sharp(buffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 8 })
        .toBuffer();
    } else {
      thumbnailBuffer = await sharp(buffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
    }

    // Convert back to data URL
    const thumbnailBase64 = thumbnailBuffer.toString('base64');
    return `data:image/${outputFormat};base64,${thumbnailBase64}`;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // Return original image if thumbnail generation fails
    return imageData;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UploadRequest;
    if (body.memberId) body.memberId = normalizeMemberId(body.memberId) || body.memberId;
    if (body.taggedMemberIds) {
      body.taggedMemberIds = body.taggedMemberIds.map(id => normalizeMemberId(id) || id);
    }

    // Validate required fields
    if (!body.imageData) {
      return NextResponse.json(
        { error: 'Image data is required', errorAr: 'بيانات الصورة مطلوبة' },
        { status: 400 }
      );
    }

    if (!body.uploaderName) {
      return NextResponse.json(
        { error: 'Uploader name is required', errorAr: 'اسم المُحمّل مطلوب' },
        { status: 400 }
      );
    }

    // Validate media (image or video)
    const mediaValidation = validateBase64Media(body.imageData);
    if (!mediaValidation.valid) {
      return NextResponse.json(
        { error: mediaValidation.error, errorAr: mediaValidation.error },
        { status: 400 }
      );
    }
    
    const isVideo = mediaValidation.isVideo || false;

    // Validate category
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`, errorAr: 'تصنيف غير صالح' },
        { status: 400 }
      );
    }

    // Validate year if provided
    if (body.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (body.year < 1800 || body.year > currentYear) {
        return NextResponse.json(
          { error: `Year must be between 1800 and ${currentYear}`, errorAr: 'السنة غير صالحة' },
          { status: 400 }
        );
      }
    }

    // Get client IP
    const ipAddress = getClientIP(request);

    // Optional: Try to get authenticated user info from session
    // For now, we allow both authenticated and guest uploads
    let uploadedBy: string | undefined;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // In a real implementation, validate the token and get user ID
      // For now, we'll just use the token as a marker
      uploadedBy = 'authenticated';
    }

    // Generate thumbnail (only for images, not videos)
    let thumbnailData: string | undefined;
    if (!isVideo) {
      thumbnailData = await generateThumbnail(body.imageData);
    }

    // Prepare the input
    const input: CreatePendingImageInput = {
      imageData: body.imageData,
      thumbnailData: thumbnailData || '', // For videos, no thumbnail
      category: body.category || 'memory',
      title: sanitizeString(body.title),
      titleAr: sanitizeString(body.titleAr),
      caption: sanitizeString(body.caption),
      captionAr: sanitizeString(body.captionAr),
      year: body.year,
      memberId: body.memberId,
      memberName: sanitizeString(body.memberName),
      taggedMemberIds: body.taggedMemberIds,
      folderId: body.folderId,
      uploadedBy,
      uploadedByName: sanitizeString(body.uploaderName)!,
      uploadedByEmail: body.uploaderEmail,
      ipAddress,
    };

    // Create the pending image
    const pendingImage = await createPendingImage(input);

    const mediaType = isVideo ? 'فيديو' : 'صورة';
    return NextResponse.json({
      success: true,
      message: isVideo ? 'Video uploaded successfully and is pending approval' : 'Image uploaded successfully and is pending approval',
      messageAr: `تم رفع ال${mediaType} بنجاح وهو بانتظار الموافقة`,
      pendingImage: {
        id: pendingImage.id,
        category: pendingImage.category,
        title: pendingImage.title,
        reviewStatus: pendingImage.reviewStatus,
        uploadedAt: pendingImage.uploadedAt,
        isVideo,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', errorAr: 'فشل في رفع الصورة' },
      { status: 500 }
    );
  }
}
