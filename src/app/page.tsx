'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TreePine, Users, PlusCircle, BarChart3, ChevronLeft,
  Download, Upload, Edit, History, Copy, Search, Settings
} from 'lucide-react';

interface Statistics {
  totalMembers: number;
  males: number;
  females: number;
  generations: number;
  branches: { name: string; count: number }[];
  generationBreakdown: {
    generation: number;
    count: number;
    males: number;
    females: number;
    percentage: number;
  }[];
}

export default function HomePage() {
  const [stats, setStats] = useState<Statistics>({
    totalMembers: 0,
    males: 0,
    females: 0,
    generations: 0,
    branches: [],
    generationBreakdown: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch('/api/statistics');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  const quickActions = [
    {
      href: '/tree',
      icon: TreePine,
      title: 'الشجرة التفاعلية',
      titleEn: 'Interactive Tree',
      description: 'عرض شجرة العائلة بشكل تفاعلي مع إمكانية التكبير والتصغير',
      color: 'green',
    },
    {
      href: '/registry',
      icon: Users,
      title: 'سجل الأفراد',
      titleEn: 'Family Registry',
      description: 'قائمة شاملة بجميع أفراد العائلة مع تفاصيلهم',
      color: 'blue',
    },
    {
      href: '/quick-add',
      icon: PlusCircle,
      title: 'إضافة سريعة',
      titleEn: 'Quick Add',
      description: 'إضافة أفراد جدد بسرعة مع الملء التلقائي للبيانات',
      color: 'yellow',
    },
    {
      href: '/dashboard',
      icon: BarChart3,
      title: 'لوحة الإحصائيات',
      titleEn: 'Dashboard',
      description: 'تحليلات وإحصائيات تفصيلية عن العائلة',
      color: 'purple',
    },
  ];

  const tools = [
    { href: '/search', icon: Search, label: 'البحث', labelEn: 'Search' },
    { href: '/tree-editor', icon: Edit, label: 'محرر الشجرة', labelEn: 'Tree Editor' },
    { href: '/export', icon: Download, label: 'تصدير', labelEn: 'Export' },
    { href: '/import', icon: Upload, label: 'استيراد', labelEn: 'Import' },
    { href: '/duplicates', icon: Copy, label: 'التكرارات', labelEn: 'Duplicates' },
    { href: '/history', icon: History, label: 'السجل', labelEn: 'History' },
    { href: '/admin', icon: Settings, label: 'لوحة التحكم', labelEn: 'Admin' },
  ];

  const colorClasses: Record<string, { bg: string; bgHover: string; text: string; border: string }> = {
    green: { bg: 'bg-green-100', bgHover: 'group-hover:bg-green-500', text: 'text-green-600', border: 'hover:border-green-500' },
    blue: { bg: 'bg-blue-100', bgHover: 'group-hover:bg-blue-500', text: 'text-blue-600', border: 'hover:border-blue-500' },
    yellow: { bg: 'bg-yellow-100', bgHover: 'group-hover:bg-yellow-500', text: 'text-yellow-600', border: 'hover:border-yellow-500' },
    purple: { bg: 'bg-purple-100', bgHover: 'group-hover:bg-purple-500', text: 'text-purple-600', border: 'hover:border-purple-500' },
  };

  // Generation icons for accessibility (colorblind users)
  const genIcons = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-bl from-green-600 via-green-700 to-green-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="text-6xl md:text-8xl mb-6" role="img" aria-label="شجرة العائلة">🌳</div>
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
              className="bg-white text-green-700 px-8 py-3 rounded-full font-bold text-lg hover:bg-green-50 transition-colors flex items-center gap-2 shadow-lg"
            >
              <TreePine size={20} aria-hidden="true" />
              استعرض الشجرة
              <ChevronLeft size={20} aria-hidden="true" />
            </Link>
            <Link
              href="/quick-add"
              className="bg-green-500 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-green-400 transition-colors flex items-center gap-2 border-2 border-white shadow-lg"
            >
              <PlusCircle size={20} aria-hidden="true" />
              إضافة عضو جديد
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="py-12 -mt-8" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">إحصائيات العائلة</h2>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <article className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-blue-500">
              <div className="text-4xl mb-2" role="img" aria-label="أفراد">👥</div>
              <div className="text-3xl md:text-4xl font-bold text-blue-600">{stats.totalMembers}</div>
              <div className="text-gray-600 mt-1">إجمالي الأفراد</div>
              <div className="text-sm text-gray-400">Total Members</div>
            </article>

            <article className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-blue-400">
              <div className="text-4xl mb-2" role="img" aria-label="ذكور">👨</div>
              <div className="text-3xl md:text-4xl font-bold text-blue-500">{stats.males}</div>
              <div className="text-gray-600 mt-1">الذكور</div>
              <div className="text-sm text-gray-400">Males</div>
            </article>

            <article className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-pink-400">
              <div className="text-4xl mb-2" role="img" aria-label="إناث">👩</div>
              <div className="text-3xl md:text-4xl font-bold text-pink-500">{stats.females}</div>
              <div className="text-gray-600 mt-1">الإناث</div>
              <div className="text-sm text-gray-400">Females</div>
            </article>

            <article className="stat-card bg-white rounded-2xl shadow-lg p-6 text-center border-t-4 border-green-500">
              <div className="text-4xl mb-2" role="img" aria-label="أجيال">🌳</div>
              <div className="text-3xl md:text-4xl font-bold text-green-600">{stats.generations}</div>
              <div className="text-gray-600 mt-1">الأجيال</div>
              <div className="text-sm text-gray-400">Generations</div>
            </article>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-gray-100" aria-labelledby="quick-actions-heading">
        <div className="container mx-auto px-4">
          <h2 id="quick-actions-heading" className="text-3xl font-bold text-center mb-8 text-gray-800">
            الوصول السريع
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const colors = colorClasses[action.color];
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 border-2 border-transparent ${colors.border}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center ${colors.bgHover} transition-colors`}>
                      <Icon className={`${colors.text} group-hover:text-white`} size={28} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{action.title}</h3>
                      <p className="text-sm text-gray-500">{action.titleEn}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600 text-sm">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-12" aria-labelledby="tools-heading">
        <div className="container mx-auto px-4">
          <h2 id="tools-heading" className="text-3xl font-bold text-center mb-2 text-gray-800">
            أدوات إضافية
          </h2>
          <p className="text-center text-gray-500 mb-8">Additional Tools</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-sm border border-gray-200 hover:shadow-md hover:border-green-300 transition-all text-gray-700 hover:text-green-600"
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="font-medium">{tool.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Generation Overview */}
      <section className="py-12 bg-gray-100" aria-labelledby="generations-heading">
        <div className="container mx-auto px-4">
          <h2 id="generations-heading" className="text-3xl font-bold text-center mb-8 text-gray-800">
            نظرة عامة على الأجيال
          </h2>
          <div className="bg-white rounded-2xl shadow-lg p-6 overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th scope="col" className="p-3 text-right">الجيل</th>
                  <th scope="col" className="p-3 text-center">العدد</th>
                  <th scope="col" className="p-3 text-center">الذكور</th>
                  <th scope="col" className="p-3 text-center">الإناث</th>
                  <th scope="col" className="p-3 text-center">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {stats.generationBreakdown.map((gen) => (
                  <tr key={gen.generation} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-bold gen-${gen.generation}`}>
                        <span aria-hidden="true">{genIcons[gen.generation - 1] || gen.generation}</span>
                        الجيل {gen.generation}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-lg">{gen.count}</td>
                    <td className="p-3 text-center">
                      <span className="badge-male inline-flex items-center gap-1">
                        {gen.males}
                        <span role="img" aria-label="ذكور">👨</span>
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="badge-female inline-flex items-center gap-1">
                        {gen.females}
                        <span role="img" aria-label="إناث">👩</span>
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={gen.percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`نسبة الجيل ${gen.generation}: ${gen.percentage}%`}
                        >
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
      <section className="py-12" aria-labelledby="branches-heading">
        <div className="container mx-auto px-4">
          <h2 id="branches-heading" className="text-3xl font-bold text-center mb-8 text-gray-800">
            فروع العائلة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {stats.branches.map((branch) => (
              <Link
                key={branch.name}
                href="/branches"
                className="bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow group"
              >
                <div className="text-4xl mb-3" role="img" aria-label="فرع">🌿</div>
                <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">{branch.name}</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">{branch.count}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats.totalMembers > 0 ? Math.round((branch.count / stats.totalMembers) * 100) : 0}% من العائلة
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
