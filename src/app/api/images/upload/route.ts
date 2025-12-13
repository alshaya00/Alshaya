import { NextRequest, NextResponse } from 'next/server';
import { createPendingImage, type CreatePendingImageInput } from '@/lib/db/images';
import sharp from 'sharp';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Thumbnail settings
const THUMBNAIL_MAX_SIZE = 200;
const THUMBNAIL_QUALITY = 80;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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

function validateBase64Image(dataUrl: string): { valid: boolean; error?: string; type?: string; size?: number } {
  // Check if it's a valid data URL
  const match = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: 'Invalid image format. Must be a base64 data URL.' };
  }

  const mimeType = match[1];
  const base64Data = match[2];

  // Check mime type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid image type: ${mimeType}. Allowed types: ${ALLOWED_TYPES.join(', ')}` };
  }

  // Calculate approximate file size
  const size = Math.ceil((base64Data.length * 3) / 4);
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `Image too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }

  return { valid: true, type: mimeType, size };
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

    // Validate image
    const imageValidation = validateBase64Image(body.imageData);
    if (!imageValidation.valid) {
      return NextResponse.json(
        { error: imageValidation.error, errorAr: 'صورة غير صالحة' },
        { status: 400 }
      );
    }

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

    // Generate thumbnail
    const thumbnailData = await generateThumbnail(body.imageData);

    // Prepare the input
    const input: CreatePendingImageInput = {
      imageData: body.imageData,
      thumbnailData,
      category: body.category || 'memory',
      title: sanitizeString(body.title),
      titleAr: sanitizeString(body.titleAr),
      caption: sanitizeString(body.caption),
      captionAr: sanitizeString(body.captionAr),
      year: body.year,
      memberId: body.memberId,
      memberName: sanitizeString(body.memberName),
      taggedMemberIds: body.taggedMemberIds,
      uploadedBy,
      uploadedByName: sanitizeString(body.uploaderName)!,
      uploadedByEmail: body.uploaderEmail,
      ipAddress,
    };

    // Create the pending image
    const pendingImage = createPendingImage(input);

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully and is pending approval',
      messageAr: 'تم رفع الصورة بنجاح وهي بانتظار الموافقة',
      pendingImage: {
        id: pendingImage.id,
        category: pendingImage.category,
        title: pendingImage.title,
        reviewStatus: pendingImage.reviewStatus,
        uploadedAt: pendingImage.uploadedAt,
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
