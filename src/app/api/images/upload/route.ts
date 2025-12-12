import { NextRequest, NextResponse } from 'next/server';
import { createPendingImage, type CreatePendingImageInput } from '@/lib/db/images';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

// Generate a thumbnail (smaller version of the image)
function generateThumbnail(imageData: string, maxSize: number = 200): string {
  // For server-side, we'll just store the original
  // In a real app, you'd use sharp or similar for image processing
  // For now, return the original (client handles resizing before upload)
  return imageData;
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

    // Prepare the input
    const input: CreatePendingImageInput = {
      imageData: body.imageData,
      thumbnailData: generateThumbnail(body.imageData),
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
