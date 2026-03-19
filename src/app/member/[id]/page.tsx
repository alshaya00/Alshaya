import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllMembersFromDb, getChildrenFromDb } from '@/lib/db';
import { calculateAge, getGenerationColor, getStatusBadge, formatMemberId, normalizeMemberId, getMemberIdVariants } from '@/lib/utils';

import { getMemberPrivacySetting } from '@/lib/auth/db-store';
import MemberPhotoSection from '@/components/MemberPhotoSection';
import MemberBreastfeedingSection from '@/components/MemberBreastfeedingSection';
import MemberStoriesSection from '@/components/MemberStoriesSection';
import MemberVersionHistory from '@/components/MemberVersionHistory';
import GenderAvatar from '@/components/GenderAvatar';
import MemberProfileAvatar from '@/components/MemberProfileAvatar';
import MemberStatusChanger from '@/components/MemberStatusChanger';
import MemberPersonalInfoSection from '@/components/MemberPersonalInfoSection';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import {
  User,
  Users,
  TreePine,
  ChevronLeft,
  GitBranch,
  Edit,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: { id: string };
}

export default async function MemberPage({ params }: PageProps) {
  try {
  const idVariants = getMemberIdVariants(params.id);
  const allMembers = await getAllMembersFromDb();
  const member = allMembers.find((m) => idVariants.includes(m.id));

  if (!member) {
    notFound();
  }

  const children = await getChildrenFromDb(member.id);
  const father = member.fatherId ? allMembers.find((m) => m.id === member.fatherId) ?? null : null;
  const siblings = father ? (await getChildrenFromDb(father.id)).filter((s) => s.id !== member.id) : [];
  const statusBadge = getStatusBadge(member.status);

  const grandchildren = [];
  for (const child of children) {
    const gc = await getChildrenFromDb(child.id);
    grandchildren.push(...gc);
  }

  const lineageBranchAncestor = member.lineageBranchId
    ? allMembers.find((m) => m.id === member.lineageBranchId)
    : null;
  const subBranchAncestor = member.subBranchId
    ? allMembers.find((m) => m.id === member.subBranchId)
    : null;

  // Fetch privacy setting from server to avoid exposing data in HTML
  const hidePersonalInfo = await getMemberPrivacySetting(member.id);

  return (
    <div className="min-h-screen py-6 lg:py-8 px-4 lg:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/registry" className="hover:text-foreground transition-colors">
                السجل
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronLeft size={14} className="text-muted-foreground/50" aria-hidden="true" />
              <span className="text-foreground font-medium">
                {member.firstName}
              </span>
            </li>
          </ol>
        </nav>

        {/* Profile Header Card */}
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-soft overflow-hidden mb-6">
          <div
            className={`p-6 lg:p-8 ${
              member.gender?.toUpperCase() === 'MALE'
                ? 'bg-gradient-to-l from-blue-500 to-blue-600'
                : 'bg-gradient-to-l from-pink-500 to-pink-600'
            } text-white`}
          >
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-right">
              <ClientErrorBoundary>
                <MemberProfileAvatar
                  memberId={member.id}
                  memberName={member.firstName}
                  gender={member.gender}
                  size="2xl"
                />
              </ClientErrorBoundary>
              <div className="w-full">
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-bold">
                    {member.fatherName
                      ? `${member.firstName} بن ${member.fatherName}`
                      : member.firstName}
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-xs font-medium">
                    {formatMemberId(member.id)}
                  </span>
                </div>
                <p className="text-white/80 text-lg">{member.fullNameAr}</p>
                <p className="text-white/60 text-sm mt-1" dir="ltr">{member.fullNameEn}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Generation */}
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white mb-2 ${getGenerationColor(
                    member.generation
                  )}`}
                >
                  الجيل {member.generation}
                </span>
                <p className="text-sm text-muted-foreground">Generation</p>
              </div>

              {/* Birth Year */}
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-foreground mb-1">
                  {member.birthYear || '-'}
                </p>
                <p className="text-sm text-muted-foreground">سنة الميلاد</p>
                {member.birthYear && (
                  <p className="text-xs text-muted-foreground">
                    ({calculateAge(member.birthYear, member.birthCalendar)} سنة)
                  </p>
                )}
              </div>

              {/* Branch */}
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{member.branch}</p>
                <p className="text-sm text-muted-foreground">الفرع</p>
              </div>

              {/* Status */}
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  member.status === 'Living'
                    ? 'bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-800 border-transparent dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {statusBadge.text}
                </span>
                <p className="text-sm text-muted-foreground mt-2">الحالة</p>
                {member.deathYear && member.status === 'Deceased' && (
                  <p className="text-xs text-muted-foreground mt-1">توفي: {member.deathYear}</p>
                )}
                <div className="mt-2">
                  <ClientErrorBoundary>
                    <MemberStatusChanger
                      memberId={member.id}
                      currentStatus={member.status}
                      currentDeathYear={member.deathYear}
                      birthCalendar={member.birthCalendar}
                    />
                  </ClientErrorBoundary>
                </div>
              </div>
            </div>

            {/* Lineage Branch Info */}
            {(member.lineageBranchName || member.subBranchName) && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 mb-3">
                  <GitBranch size={20} />
                  <h3 className="font-semibold">نسب الفرع</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {lineageBranchAncestor && (
                    <Link
                      href={`/member/${lineageBranchAncestor.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
                    >
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">الفرع الرئيسي:</span>
                      <span className="text-foreground text-sm">{member.lineageBranchName}</span>
                    </Link>
                  )}
                  {subBranchAncestor && member.subBranchId !== member.lineageBranchId && (
                    <Link
                      href={`/member/${subBranchAncestor.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-accent transition-colors"
                    >
                      <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">الفرع الفرعي:</span>
                      <span className="text-foreground text-sm">{member.subBranchName}</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Photos Section */}
            <ClientErrorBoundary>
              <MemberPhotoSection memberId={member.id} memberName={member.firstName} />
            </ClientErrorBoundary>

            {/* Personal Info & Ancestry Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <ClientErrorBoundary>
                <MemberPersonalInfoSection
                  memberId={member.id}
                  city={hidePersonalInfo ? null : member.city}
                  occupation={hidePersonalInfo ? null : member.occupation}
                  phone={hidePersonalInfo ? null : member.phone}
                  email={hidePersonalInfo ? null : member.email}
                  serverHidePersonalInfo={hidePersonalInfo}
                />
              </ClientErrorBoundary>

              {/* Ancestry Card */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TreePine className="text-emerald-500" size={20} />
                  الأنساب
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">اسم الأب:</span>
                    <span className="text-foreground font-medium">{member.fatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">اسم الجد:</span>
                    <span className="text-foreground font-medium">{member.grandfatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">اسم جد الأب:</span>
                    <span className="text-foreground font-medium">{member.greatGrandfatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground">اسم العائلة:</span>
                    <span className="text-foreground font-medium">{member.familyName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Biography */}
            {member.biography && (
              <div className="rounded-lg border border-border bg-card p-4 mb-6">
                <h3 className="font-semibold text-foreground mb-3">السيرة الذاتية</h3>
                <p className="text-muted-foreground leading-relaxed">{member.biography}</p>
              </div>
            )}

            {/* Separator */}
            <div className="h-[1px] w-full bg-border mb-6" role="none" />

            {/* Father */}
            {father && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="text-purple-500" size={20} />
                  الأب
                </h3>
                <Link
                  href={`/member/${father.id}`}
                  className="inline-flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
                >
                  <GenderAvatar gender="Male" size="lg" />
                  <div>
                    <p className="font-semibold text-foreground">{father.firstName}</p>
                    <p className="text-sm text-muted-foreground">{father.fullNameAr}</p>
                  </div>
                  <ChevronLeft className="text-muted-foreground" size={20} />
                </Link>
              </div>
            )}

            {/* Siblings */}
            {siblings.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="text-orange-500" size={20} />
                  الإخوة
                  <span className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                    {siblings.length}
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {siblings.map((sibling) => (
                    <Link
                      key={sibling.id}
                      href={`/member/${sibling.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors"
                    >
                      <GenderAvatar gender={sibling.gender} size="md" />
                      <span className="font-medium text-foreground">{sibling.firstName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Children */}
            {children.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="text-emerald-500" size={20} />
                  الأبناء
                  <span className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                    {children.length}
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/member/${child.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors"
                    >
                      <GenderAvatar gender={child.gender} size="md" />
                      <span className="font-medium text-foreground">{child.firstName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Grandchildren */}
            {grandchildren.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="text-teal-500" size={20} />
                  الأحفاد
                  <span className="inline-flex items-center rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
                    {grandchildren.length}
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {grandchildren.slice(0, 12).map((gc) => (
                    <Link
                      key={gc.id}
                      href={`/member/${gc.id}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 hover:bg-accent transition-colors"
                    >
                      <GenderAvatar gender={gc.gender} size="sm" />
                      <span className="text-sm text-foreground">{gc.firstName}</span>
                    </Link>
                  ))}
                  {grandchildren.length > 12 && (
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      +{grandchildren.length - 12} آخرين
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Breastfeeding, Stories, History */}
            <ClientErrorBoundary>
              <MemberBreastfeedingSection
                member={member}
                father={father}
                siblings={siblings}
                children={children}
                grandchildren={grandchildren}
              />
            </ClientErrorBoundary>
            <ClientErrorBoundary>
              <MemberStoriesSection memberId={member.id} memberName={member.firstName} />
            </ClientErrorBoundary>
            <ClientErrorBoundary>
              <MemberVersionHistory memberId={member.id} />
            </ClientErrorBoundary>

            {/* Action Buttons */}
            <div className="h-[1px] w-full bg-border my-6" role="none" />
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/tree?highlight=${member.id}`}
                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 h-10 px-4 py-2 text-sm rounded-md gap-2"
              >
                <TreePine size={18} />
                عرض في الشجرة
              </Link>
              <Link
                href={`/edit/${member.id}`}
                className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 h-10 px-4 py-2 text-sm rounded-md gap-2"
              >
                <Edit size={18} />
                تعديل البيانات
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error: any) {
    if (error?.digest?.includes('NEXT_NOT_FOUND') || error?.digest?.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Error rendering member page:', error);
    return (
      <div className="min-h-screen py-8 px-4" dir="rtl">
        <div className="mx-auto max-w-lg">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">حدث خطأ في تحميل الصفحة</h2>
            <p className="text-muted-foreground mb-6">عذراً، لم نتمكن من تحميل بيانات هذا العضو. يرجى المحاولة مرة أخرى.</p>
            <a href="/registry" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors">العودة إلى السجل</a>
          </div>
        </div>
      </div>
    );
  }
}
