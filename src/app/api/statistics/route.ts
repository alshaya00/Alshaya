import { getStatisticsFromDb } from '@/lib/db';
import { familyInfo } from '@/config/constants';
import { apiSuccess, apiServerError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await getStatisticsFromDb();

    const currentYear = new Date().getFullYear();
    const yearsOfHistory = currentYear - familyInfo.foundingYear;

    const response = apiSuccess({
      ...stats,
      yearsOfHistory,
      foundingYear: familyInfo.foundingYear,
      familyName: {
        ar: familyInfo.nameAr,
        en: familyInfo.nameEn,
      },
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    return apiServerError(error);
  }
}
