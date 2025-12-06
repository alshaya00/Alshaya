import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMemberById, getChildren, FamilyMember } from '@/lib/data';
import { calculateAge, getGenerationColor, getStatusBadge } from '@/lib/utils';
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
} from 'lucide-react';

interface PageProps {
  params: { id: string };
}

export default function MemberPage({ params }: PageProps) {
  const member = getMemberById(params.id);

  if (!member) {
    notFound();
  }

  const children = getChildren(member.id);
  const father = member.fatherId ? getMemberById(member.fatherId) : null;
  const siblings = father ? getChildren(father.id).filter((s) => s.id !== member.id) : [];
  const statusBadge = getStatusBadge(member.status);

  return (
    <div className="min-h-screen py-8 bg-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Link
          href="/registry"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowRight size={20} />
          العودة إلى السجل
        </Link>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div
            className={`p-8 ${
              member.gender === 'Male'
                ? 'bg-gradient-to-l from-blue-500 to-blue-600'
                : 'bg-gradient-to-l from-pink-500 to-pink-600'
            } text-white`}
          >
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-5xl">
                {member.gender === 'Male' ? '👨' : '👩'}
              </div>
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

          {/* Content */}
          <div className="p-6">
            {/* Quick Stats */}
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

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Personal Info */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="text-blue-600" size={20} />
                  المعلومات الشخصية
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">الاسم</span>
                    <span className="font-medium">{member.firstName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم الأب</span>
                    <span className="font-medium">{member.fatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">اسم الجد</span>
                    <span className="font-medium">{member.grandfatherName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الجنس</span>
                    <span className="font-medium">
                      {member.gender === 'Male' ? '👨 ذكر' : '👩 أنثى'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <MapPin className="text-red-600" size={20} />
                  معلومات التواصل
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">المدينة</span>
                    <span className="font-medium">{member.city || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المهنة</span>
                    <span className="font-medium">{member.occupation || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الهاتف</span>
                    <span className="font-medium">{member.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">البريد</span>
                    <span className="font-medium">{member.email || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Family Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Children */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Users className="text-green-600" size={20} />
                  الأبناء ({children.length})
                </h2>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-blue-100 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{member.sonsCount}</p>
                    <p className="text-xs text-gray-500">أبناء</p>
                  </div>
                  <div className="flex-1 bg-pink-100 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-pink-600">{member.daughtersCount}</p>
                    <p className="text-xs text-gray-500">بنات</p>
                  </div>
                </div>
                {children.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/member/${child.id}`}
                        className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            child.gender === 'Male'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-pink-100 text-pink-600'
                          }`}
                        >
                          {child.gender === 'Male' ? '👨' : '👩'}
                        </span>
                        <span className="font-medium">{child.firstName}</span>
                        <span className="text-xs text-gray-400">({child.id})</span>
                        <ChevronLeft size={16} className="mr-auto text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">لا يوجد أبناء مسجلين</p>
                )}
              </div>

              {/* Siblings */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Users className="text-purple-600" size={20} />
                  الإخوة والأخوات ({siblings.length})
                </h2>
                {siblings.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {siblings.map((sibling) => (
                      <Link
                        key={sibling.id}
                        href={`/member/${sibling.id}`}
                        className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            sibling.gender === 'Male'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-pink-100 text-pink-600'
                          }`}
                        >
                          {sibling.gender === 'Male' ? '👨' : '👩'}
                        </span>
                        <span className="font-medium">{sibling.firstName}</span>
                        <span className="text-xs text-gray-400">({sibling.id})</span>
                        <ChevronLeft size={16} className="mr-auto text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">لا يوجد إخوة مسجلين</p>
                )}
              </div>
            </div>

            {/* Father Link */}
            {father && (
              <div className="bg-green-50 rounded-xl p-5 mb-8">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TreePine className="text-green-600" size={20} />
                  الأب
                </h2>
                <Link
                  href={`/member/${father.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg hover:bg-green-100 transition-colors"
                >
                  <span
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-blue-100 border-2 border-blue-400`}
                  >
                    👨
                  </span>
                  <div className="flex-1">
                    <p className="font-bold">{father.firstName}</p>
                    <p className="text-sm text-gray-500">{father.fullNameAr}</p>
                  </div>
                  <span className="text-xs text-gray-400">({father.id})</span>
                  <ChevronLeft size={20} className="text-gray-400" />
                </Link>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/tree"
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                <TreePine size={20} />
                عرض في الشجرة
              </Link>
              <Link
                href="/registry"
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                <Users size={20} />
                العودة للسجل
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
