import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllMembersFromDb, getChildrenFromDb } from '@/lib/db';
import { calculateAge, getGenerationColor, getStatusBadge } from '@/lib/utils';
import MemberPhotoSection from '@/components/MemberPhotoSection';
import MemberBreastfeedingSection from '@/components/MemberBreastfeedingSection';
import MemberStoriesSection from '@/components/MemberStoriesSection';
import MemberVersionHistory from '@/components/MemberVersionHistory';
import GenderAvatar from '@/components/GenderAvatar';
import MemberProfileAvatar from '@/components/MemberProfileAvatar';
import {
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Users,
  TreePine,
  ChevronLeft,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

interface PageProps {
  params: { id: string };
}

export default async function MemberPage({ params }: PageProps) {
  const allMembers = await getAllMembersFromDb();
  const member = allMembers.find((m) => m.id === params.id);

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

  return (
    <div className="min-h-screen py-8 bg-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href="/registry"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowRight size={20} />
          العودة إلى السجل
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div
            className={`p-8 ${
              member.gender === 'Male'
                ? 'bg-gradient-to-l from-blue-500 to-blue-600'
                : 'bg-gradient-to-l from-pink-500 to-pink-600'
            } text-white`}
          >
            <div className="flex items-center gap-6">
              <MemberProfileAvatar 
                memberId={member.id} 
                memberName={member.firstName} 
                gender={member.gender} 
                size="2xl" 
              />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{member.firstName}</h1>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                    {member.id}
                  </span>
                </div>
                <p className="text-white/80 text-lg">{member.fullNameAr}</p>
                <p className="text-white/60 text-sm mt-1">{member.fullNameEn}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold mb-2 ${getGenerationColor(
                    member.generation
                  )}`}
                >
                  الجيل {member.generation}
                </span>
                <p className="text-sm text-gray-500">Generation</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-800 mb-1">
                  {member.birthYear || '-'}
                </p>
                <p className="text-sm text-gray-500">سنة الميلاد</p>
                {member.birthYear && (
                  <p className="text-xs text-gray-400">
                    ({calculateAge(member.birthYear)} سنة)
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600 mb-1">{member.branch}</p>
                <p className="text-sm text-gray-500">الفرع</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <span className={`px-3 py-1 rounded-full text-sm ${statusBadge.color}`}>
                  {statusBadge.text}
                </span>
                <p className="text-sm text-gray-500 mt-2">الحالة</p>
              </div>
            </div>

            {(member.lineageBranchName || member.subBranchName) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-8">
                <div className="flex items-center gap-2 text-amber-700 mb-3">
                  <GitBranch size={20} />
                  <h3 className="font-bold">نسب الفرع</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  {lineageBranchAncestor && (
                    <Link
                      href={`/member/${lineageBranchAncestor.id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow transition-shadow"
                    >
                      <span className="text-amber-600 font-bold">الفرع الرئيسي:</span>
                      <span className="text-gray-700">{member.lineageBranchName}</span>
                    </Link>
                  )}
                  {subBranchAncestor && member.subBranchId !== member.lineageBranchId && (
                    <Link
                      href={`/member/${subBranchAncestor.id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow transition-shadow"
                    >
                      <span className="text-orange-600 font-bold">الفرع الفرعي:</span>
                      <span className="text-gray-700">{member.subBranchName}</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            <MemberPhotoSection memberId={member.id} memberName={member.firstName} />

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <User className="text-blue-500" size={20} />
                  المعلومات الشخصية
                </h3>
                <div className="space-y-3">
                  {member.city && (
                    <div className="flex items-center gap-3">
                      <MapPin className="text-gray-400" size={18} />
                      <span className="text-gray-600">{member.city}</span>
                    </div>
                  )}
                  {member.occupation && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="text-gray-400" size={18} />
                      <span className="text-gray-600">{member.occupation}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="text-gray-400" size={18} />
                      <span className="text-gray-600" dir="ltr">
                        {member.phone}
                      </span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="text-gray-400" size={18} />
                      <span className="text-gray-600">{member.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <TreePine className="text-green-500" size={20} />
                  الأنساب
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم الأب:</span>
                    <span className="text-gray-800">{member.fatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم الجد:</span>
                    <span className="text-gray-800">{member.grandfatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم جد الأب:</span>
                    <span className="text-gray-800">{member.greatGrandfatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم العائلة:</span>
                    <span className="text-gray-800">{member.familyName}</span>
                  </div>
                </div>
              </div>
            </div>

            {member.biography && (
              <div className="bg-gray-50 rounded-xl p-4 mb-8">
                <h3 className="font-bold text-gray-700 mb-3">السيرة الذاتية</h3>
                <p className="text-gray-600 leading-relaxed">{member.biography}</p>
              </div>
            )}

            {father && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <User className="text-purple-500" size={20} />
                  الأب
                </h3>
                <Link
                  href={`/member/${father.id}`}
                  className="inline-flex items-center gap-3 bg-purple-50 hover:bg-purple-100 rounded-xl p-4 transition-colors"
                >
                  <GenderAvatar gender="Male" size="lg" />
                  <div>
                    <p className="font-bold text-gray-800">{father.firstName}</p>
                    <p className="text-sm text-gray-500">{father.fullNameAr}</p>
                  </div>
                  <ChevronLeft className="text-purple-400" size={20} />
                </Link>
              </div>
            )}

            {siblings.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="text-orange-500" size={20} />
                  الإخوة ({siblings.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {siblings.map((sibling) => (
                    <Link
                      key={sibling.id}
                      href={`/member/${sibling.id}`}
                      className="flex items-center gap-3 bg-orange-50 hover:bg-orange-100 rounded-xl p-3 transition-colors"
                    >
                      <GenderAvatar gender={sibling.gender} size="md" />
                      <span className="font-medium text-gray-800">{sibling.firstName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {children.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="text-green-500" size={20} />
                  الأبناء ({children.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/member/${child.id}`}
                      className="flex items-center gap-3 bg-green-50 hover:bg-green-100 rounded-xl p-3 transition-colors"
                    >
                      <GenderAvatar gender={child.gender} size="md" />
                      <span className="font-medium text-gray-800">{child.firstName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {grandchildren.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="text-teal-500" size={20} />
                  الأحفاد ({grandchildren.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {grandchildren.slice(0, 12).map((gc) => (
                    <Link
                      key={gc.id}
                      href={`/member/${gc.id}`}
                      className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 rounded-lg p-2 transition-colors"
                    >
                      <GenderAvatar gender={gc.gender} size="sm" />
                      <span className="text-sm text-gray-700">{gc.firstName}</span>
                    </Link>
                  ))}
                  {grandchildren.length > 12 && (
                    <div className="flex items-center justify-center text-sm text-gray-500">
                      +{grandchildren.length - 12} آخرين
                    </div>
                  )}
                </div>
              </div>
            )}

            <MemberBreastfeedingSection 
              member={member} 
              father={father} 
              siblings={siblings} 
              children={children} 
              grandchildren={grandchildren} 
            />
            <MemberStoriesSection memberId={member.id} memberName={member.firstName} />
            <MemberVersionHistory memberId={member.id} />

            <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t">
              <Link
                href={`/tree?highlight=${member.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <TreePine size={18} />
                عرض في الشجرة
              </Link>
              <Link
                href={`/edit/${member.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <User size={18} />
                تعديل البيانات
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
