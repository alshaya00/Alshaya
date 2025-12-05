'use client';

import { getStatistics, getAllMembers } from '@/lib/data';
import { BarChart3, Users, TrendingUp, GitBranch, Calendar, MapPin } from 'lucide-react';

export default function DashboardPage() {
  const stats = getStatistics();
  const allMembers = getAllMembers();

  // Calculate additional statistics
  const livingMembers = allMembers.filter((m) => m.status === 'Living').length;
  const deceasedMembers = allMembers.filter((m) => m.status === 'Deceased').length;

  const membersByCity = allMembers
    .filter((m) => m.city)
    .reduce((acc, m) => {
      acc[m.city!] = (acc[m.city!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topCities = Object.entries(membersByCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const membersByOccupation = allMembers
    .filter((m) => m.occupation)
    .reduce((acc, m) => {
      acc[m.occupation!] = (acc[m.occupation!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topOccupations = Object.entries(membersByOccupation)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  // Calculate age distribution
  const ageGroups = {
    'أطفال (0-14)': 0,
    'شباب (15-30)': 0,
    'بالغين (31-50)': 0,
    'كبار (51-70)': 0,
    'كبار السن (70+)': 0,
  };

  const currentYear = new Date().getFullYear();
  allMembers.forEach((m) => {
    if (m.birthYear && m.status === 'Living') {
      const age = currentYear - m.birthYear;
      if (age <= 14) ageGroups['أطفال (0-14)']++;
      else if (age <= 30) ageGroups['شباب (15-30)']++;
      else if (age <= 50) ageGroups['بالغين (31-50)']++;
      else if (age <= 70) ageGroups['كبار (51-70)']++;
      else ageGroups['كبار السن (70+)']++;
    }
  });

  return (
    <div className="min-h-screen py-8 bg-gray-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <BarChart3 className="text-purple-600" size={36} />
            لوحة الإحصائيات المتقدمة
          </h1>
          <p className="text-gray-600 mt-2">Advanced Analytics Dashboard</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold">{stats.totalMembers}</div>
            <div className="text-blue-100 text-sm mt-1">إجمالي الأفراد</div>
          </div>

          <div className="stat-card bg-gradient-to-br from-blue-400 to-blue-500 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-3xl mb-2">👨</div>
            <div className="text-3xl font-bold">{stats.males}</div>
            <div className="text-blue-100 text-sm mt-1">الذكور</div>
          </div>

          <div className="stat-card bg-gradient-to-br from-pink-400 to-pink-500 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-3xl mb-2">👩</div>
            <div className="text-3xl font-bold">{stats.females}</div>
            <div className="text-pink-100 text-sm mt-1">الإناث</div>
          </div>

          <div className="stat-card bg-gradient-to-br from-green-500 to-green-600 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-3xl mb-2">🌳</div>
            <div className="text-3xl font-bold">{stats.generations}</div>
            <div className="text-green-100 text-sm mt-1">الأجيال</div>
          </div>

          <div className="stat-card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-3xl mb-2">💚</div>
            <div className="text-3xl font-bold">{livingMembers}</div>
            <div className="text-emerald-100 text-sm mt-1">على قيد الحياة</div>
          </div>

          <div className="stat-card bg-gradient-to-br from-gray-500 to-gray-600 text-white p-5 rounded-2xl shadow-lg">
            <div className="text-3xl mb-2">🕊️</div>
            <div className="text-3xl font-bold">{deceasedMembers}</div>
            <div className="text-gray-100 text-sm mt-1">متوفين</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Generation Analysis */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={24} />
              تحليل الأجيال
            </h2>
            <div className="space-y-4">
              {stats.generationBreakdown.map((gen) => (
                <div key={gen.generation}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">الجيل {gen.generation}</span>
                    <span className="text-sm text-gray-500">
                      {gen.count} ({gen.percentage}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-blue-500 h-full transition-all duration-500"
                          style={{ width: `${(gen.males / gen.count) * 100}%` }}
                          title={`ذكور: ${gen.males}`}
                        />
                        <div
                          className="bg-pink-500 h-full transition-all duration-500"
                          style={{ width: `${(gen.females / gen.count) * 100}%` }}
                          title={`إناث: ${gen.females}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs w-24 justify-end">
                      <span className="text-blue-600">👨{gen.males}</span>
                      <span className="text-pink-600">👩{gen.females}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branch Analysis */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <GitBranch className="text-green-600" size={24} />
              تحليل الفروع
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {stats.branches.map((branch) => (
                <div
                  key={branch.name}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200"
                >
                  <div className="text-3xl mb-2">🌿</div>
                  <h3 className="font-bold text-gray-800">{branch.name}</h3>
                  <p className="text-2xl font-bold text-green-600">{branch.count}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round((branch.count / stats.totalMembers) * 100)}% من العائلة
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Age Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="text-orange-600" size={24} />
              توزيع الأعمار
            </h2>
            <div className="space-y-3">
              {Object.entries(ageGroups).map(([group, count]) => (
                <div key={group} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-600">{group}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(count / livingMembers) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm font-medium text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Cities */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin className="text-red-600" size={24} />
              المدن الرئيسية
            </h2>
            <div className="space-y-3">
              {topCities.map(([city, count], index) => (
                <div key={city} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <span className="flex-1 font-medium">{city}</span>
                  <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-bold">
                    {count}
                  </span>
                </div>
              ))}
              {topCities.length === 0 && (
                <p className="text-gray-500 text-center">لا توجد بيانات</p>
              )}
            </div>
          </div>

          {/* Top Occupations */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="text-purple-600" size={24} />
              المهن الشائعة
            </h2>
            <div className="space-y-2">
              {topOccupations.map(([occupation, count]) => (
                <div
                  key={occupation}
                  className="flex items-center justify-between p-2 bg-purple-50 rounded-lg"
                >
                  <span className="text-sm">{occupation}</span>
                  <span className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-xs">
                    {count}
                  </span>
                </div>
              ))}
              {topOccupations.length === 0 && (
                <p className="text-gray-500 text-center">لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>

        {/* Gender Ratio */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            نسبة الذكور إلى الإناث
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 text-left">
                <span className="text-2xl font-bold text-blue-600">{stats.males}</span>
                <span className="text-gray-500 mr-2">ذكر</span>
              </div>
              <div className="flex-1 text-right">
                <span className="text-gray-500 ml-2">أنثى</span>
                <span className="text-2xl font-bold text-pink-600">{stats.females}</span>
              </div>
            </div>
            <div className="h-10 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 flex items-center justify-center text-white font-bold"
                style={{ width: `${(stats.males / stats.totalMembers) * 100}%` }}
              >
                {Math.round((stats.males / stats.totalMembers) * 100)}%
              </div>
              <div
                className="bg-pink-500 flex items-center justify-center text-white font-bold"
                style={{ width: `${(stats.females / stats.totalMembers) * 100}%` }}
              >
                {Math.round((stats.females / stats.totalMembers) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
