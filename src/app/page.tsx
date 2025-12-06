import Link from 'next/link';
import { getStatistics } from '@/lib/data';
import { TreePine, Users, PlusCircle, BarChart3, Search, ChevronLeft } from 'lucide-react';

export default function HomePage() {
  const stats = getStatistics();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-bl from-green-600 via-green-700 to-green-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="text-6xl md:text-8xl mb-6">🌳</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">شجرة عائلة آل شايع</h1>
          <p className="text-xl md:text-2xl text-green-100 mb-8">
            Al-Shaye Family Tree
          </p>
          <p className="text-lg text-green-200 max-w-2xl mx-auto mb-10">
            تطبيق متكامل لإدارة وعرض شجرة العائلة مع {stats.totalMembers} فرداً عبر{' '}
            {stats.generations} أجيال
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/tree"
              className="bg-white text-green-700 px-8 py-3 rounded-full font-bold text-lg hover:bg-green-50 transition-colors flex items-center gap-2"
            >
              <TreePine size={20} />
              استعرض الشجرة
              <ChevronLeft size={20} />
            </Link>
            <Link
              href="/quick-add"
              className="bg-green-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-green-400 transition-colors flex items-center gap-2 border-2 border-white"
            >
              <PlusCircle size={20} />
              إضافة عضو جديد
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="py-12 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-blue-500">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-3xl md:text-4xl font-bold text-blue-600">{stats.totalMembers}</div>
              <div className="text-gray-600 mt-1">إجمالي الأفراد</div>
              <div className="text-sm text-gray-400">Total Members</div>
            </div>

            <div className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-blue-400">
              <div className="text-4xl mb-2">👨</div>
              <div className="text-3xl md:text-4xl font-bold text-blue-500">{stats.males}</div>
              <div className="text-gray-600 mt-1">الذكور</div>
              <div className="text-sm text-gray-400">Males</div>
            </div>

            <div className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-pink-400">
              <div className="text-4xl mb-2">👩</div>
              <div className="text-3xl md:text-4xl font-bold text-pink-500">{stats.females}</div>
              <div className="text-gray-600 mt-1">الإناث</div>
              <div className="text-sm text-gray-400">Females</div>
            </div>

            <div className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-green-500">
              <div className="text-4xl mb-2">🌳</div>
              <div className="text-3xl md:text-4xl font-bold text-green-600">{stats.generations}</div>
              <div className="text-gray-600 mt-1">الأجيال</div>
              <div className="text-sm text-gray-400">Generations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            الوصول السريع
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/tree"
              className="group bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-500 transition-colors">
                  <TreePine className="text-green-600 group-hover:text-white" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">الشجرة التفاعلية</h3>
                  <p className="text-sm text-gray-500">Interactive Tree</p>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                عرض شجرة العائلة بشكل تفاعلي مع إمكانية التكبير والتصغير
              </p>
            </Link>

            <Link
              href="/registry"
              className="group bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <Users className="text-blue-600 group-hover:text-white" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">سجل الأفراد</h3>
                  <p className="text-sm text-gray-500">Family Registry</p>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                قائمة شاملة بجميع أفراد العائلة مع تفاصيلهم
              </p>
            </Link>

            <Link
              href="/quick-add"
              className="group bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-yellow-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
                  <PlusCircle className="text-yellow-600 group-hover:text-white" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">إضافة سريعة</h3>
                  <p className="text-sm text-gray-500">Quick Add</p>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                إضافة أفراد جدد بسرعة مع الملء التلقائي للبيانات
              </p>
            </Link>

            <Link
              href="/dashboard"
              className="group bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-500"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                  <BarChart3 className="text-purple-600 group-hover:text-white" size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">لوحة الإحصائيات</h3>
                  <p className="text-sm text-gray-500">Dashboard</p>
                </div>
              </div>
              <p className="mt-4 text-gray-600 text-sm">
                تحليلات وإحصائيات تفصيلية عن العائلة
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Generation Overview */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            نظرة عامة على الأجيال
          </h2>
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="p-3 text-right">الجيل</th>
                  <th className="p-3 text-center">العدد</th>
                  <th className="p-3 text-center">الذكور</th>
                  <th className="p-3 text-center">الإناث</th>
                  <th className="p-3 text-center">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {stats.generationBreakdown.map((gen) => (
                  <tr key={gen.generation} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-white text-sm font-bold gen-${gen.generation}`}>
                        الجيل {gen.generation}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-lg">{gen.count}</td>
                    <td className="p-3 text-center">
                      <span className="badge-male">{gen.males} 👨</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="badge-female">{gen.females} 👩</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-green-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${gen.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-12">
                          {gen.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Family Branches */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
            فروع العائلة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {stats.branches.map((branch) => (
              <div
                key={branch.name}
                className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-3">🌿</div>
                <h3 className="text-xl font-bold text-gray-800">{branch.name}</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">{branch.count}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {Math.round((branch.count / stats.totalMembers) * 100)}% من العائلة
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
