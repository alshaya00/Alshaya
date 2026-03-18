import { NextResponse } from 'next/server';

// Standard API response shape
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  messageAr?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Success response
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

// Success with pagination
export function apiPaginated<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number }
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  }, { status: 200 });
}

// Error response
export function apiError(
  error: string,
  messageAr?: string,
  status = 400
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error, messageAr }, { status });
}

// Not found
export function apiNotFound(
  message = 'Resource not found',
  messageAr = 'المورد غير موجود'
): NextResponse<ApiResponse> {
  return apiError(message, messageAr, 404);
}

// Unauthorized
export function apiUnauthorized(
  message = 'Unauthorized',
  messageAr = 'غير مصرح'
): NextResponse<ApiResponse> {
  return apiError(message, messageAr, 401);
}

// Forbidden
export function apiForbidden(
  message = 'Forbidden',
  messageAr = 'ممنوع'
): NextResponse<ApiResponse> {
  return apiError(message, messageAr, 403);
}

// Server error
export function apiServerError(
  error: unknown
): NextResponse<ApiResponse> {
  console.error('API Error:', error);
  return apiError(
    'Internal server error',
    'خطأ في الخادم الداخلي',
    500
  );
}

// Parse pagination params from request
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
