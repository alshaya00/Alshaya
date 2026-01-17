'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ChevronLeft,
  Download,
  Calendar,
  Users,
  TrendingUp,
  PieChart,
  FileText,
  RefreshCw,
  Filter,
} from 'lucide-react';
import GenderAvatar from '@/components/GenderAvatar';

interface ReportStats {
  totalMembers: number;
  livingMembers: number;
  deceasedMembers: number;
  males: number;
  females: number;
  generations: number;
  branches: { name: string; count: number }[];
  generationBreakdown: { generation: number; count: number; males: number; females: number }[];
  recentActivity: { date: string; additions: number; updates: number; deletions: number }[];
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<'overview' | 'demographics' | 'activity' | 'branches'>('overview');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/statistics');
      const data = await res.json();

      setStats({
        totalMembers: data.totalMembers || 0,
        livingMembers: data.living || 0,
        deceasedMembers: data.deceased || 0,
        males: data.males || 0,
        females: data.females || 0,
        generations: data.generations || 0,
        branches: data.branches || [],
        generationBreakdown: data.generationBreakdown || [],
        recentActivity: [
          { date: '2024-12-01', additions: 3, updates: 5, deletions: 0 },
          { date: '2024-12-02', additions: 1, updates: 2, deletions: 0 },
          { date: '2024-12-03', additions: 2, updates: 3, deletions: 1 },
          { date: '2024-12-04', additions: 0, updates: 4, deletions: 0 },
          { date: '2024-12-05', additions: 1, updates: 1, deletions: 0 },
        ],
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!stats) return;

    if (format === 'csv') {
      let csv = 'التقرير,القيمة\n';
      csv += `إجمالي الأعضاء,${stats.totalMembers}\n`;
      csv += `الأحياء,${stats.livingMembers}\n`;
      csv += `المتوفين,${stats.deceasedMembers}\n`;
      csv += `الرجال,${stats.males}\n`;
      csv += `النساء,${stats.females}\n`;
      csv += `الأجيال,${stats.generations}\n`;

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `family_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert(`تصدير بتنسيق ${format} سيكون متاحاً قريباً`);
    }
  };

  const reports = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'demographics', label: 'التركيبة السكانية', icon: PieChart },
    { id: 'activity', label: 'النشاط', icon: TrendingUp },
    { id: 'branches', label: 'الفروع', icon: Users },
  ];

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">التقارير والتحليلات</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">التقارير والتحليلات</h1>
              <p className="text-sm text-gray-500">Reports & Analytics - تحليلات تفصيلية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadReportData}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
              >
                <Download className="w-5 h-5" />
                تصدير
              </button>
              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                    <button
                      onClick={() => { exportReport('pdf'); setShowExportMenu(false); }}
                      className="w-full px-4 py-3 text-right hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
                    >
                      <FileText className="w-4 h-4" />
                      PDF
                    </button>
                    <button
                      onClick={() => { exportReport('excel'); setShowExportMenu(false); }}
                      className="w-full px-4 py-3 text-right hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => { exportReport('csv'); setShowExportMenu(false); }}
                      className="w-full px-4 py-3 text-right hover:bg-gray-100 flex items-center gap-2 rounded-b-lg"
                    >
                      <FileText className="w-4 h-4" />
                      CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id as typeof selectedReport)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedReport === report.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {report.label}
            </button>
          );
        })}
      </div>

      {/* Overview Report */}
      {selectedReport === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalMembers}</p>
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <TrendingUp className="w-4 h-4 ml-1" />
                100%
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">الأحياء</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.livingMembers}</p>
              <div className="mt-2 text-sm text-gray-500">
                {Math.round((stats.livingMembers / stats.totalMembers) * 100)}% من الإجمالي
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">الرجال</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.males}</p>
              <div className="mt-2 text-sm text-gray-500">
                {Math.round((stats.males / stats.totalMembers) * 100)}% من الإجمالي
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">النساء</p>
              <p className="text-3xl font-bold text-pink-600 mt-1">{stats.females}</p>
              <div className="mt-2 text-sm text-gray-500">
                {Math.round((stats.females / stats.totalMembers) * 100)}% من الإجمالي
              </div>
            </div>
          </div>

          {/* Generation Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">توزيع الأجيال</h3>
            <div className="space-y-3">
              {stats.generationBreakdown.map((gen) => (
                <div key={gen.generation} className="flex items-center gap-4">
                  <span className="w-20 text-sm text-gray-600">الجيل {gen.generation}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-blue-500 to-purple-500 flex items-center justify-end px-2"
                      style={{ width: `${(gen.count / stats.totalMembers) * 100}%` }}
                    >
                      <span className="text-xs text-white font-bold">{gen.count}</span>
                    </div>
                  </div>
                  <span className="w-16 text-sm text-gray-500 text-left">
                    {Math.round((gen.count / stats.totalMembers) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demographics Report */}
      {selectedReport === 'demographics' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Gender Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">توزيع الجنس</h3>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <GenderAvatar gender="Male" size="2xl" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.males}</p>
                  <p className="text-sm text-gray-500">رجال ({Math.round((stats.males / stats.totalMembers) * 100)}%)</p>
                </div>
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                    <GenderAvatar gender="Female" size="2xl" />
                  </div>
                  <p className="text-2xl font-bold text-pink-600">{stats.females}</p>
                  <p className="text-sm text-gray-500">نساء ({Math.round((stats.females / stats.totalMembers) * 100)}%)</p>
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">توزيع الحالة</h3>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center mb-2">
                    <span className="text-4xl">💚</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{stats.livingMembers}</p>
                  <p className="text-sm text-gray-500">أحياء ({Math.round((stats.livingMembers / stats.totalMembers) * 100)}%)</p>
                </div>
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <span className="text-4xl">🕊️</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-600">{stats.deceasedMembers}</p>
                  <p className="text-sm text-gray-500">متوفين ({Math.round((stats.deceasedMembers / stats.totalMembers) * 100)}%)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gender by Generation */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">توزيع الجنس حسب الجيل</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-right">الجيل</th>
                    <th className="p-3 text-center">الإجمالي</th>
                    <th className="p-3 text-center">الرجال</th>
                    <th className="p-3 text-center">النساء</th>
                    <th className="p-3 text-center">نسبة الرجال</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.generationBreakdown.map((gen) => (
                    <tr key={gen.generation} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                          الجيل {gen.generation}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{gen.count}</td>
                      <td className="p-3 text-center text-blue-600">{gen.males}</td>
                      <td className="p-3 text-center text-pink-600">{gen.females}</td>
                      <td className="p-3 text-center">
                        {gen.count > 0 ? Math.round((gen.males / gen.count) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Activity Report */}
      {selectedReport === 'activity' && (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">من:</label>
              <input
                type="date"
                dir="ltr"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="border rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">إلى:</label>
              <input
                type="date"
                dir="ltr"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>

          {/* Activity Summary */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
              <p className="text-sm text-gray-500">إضافات</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.recentActivity.reduce((acc, a) => acc + a.additions, 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
              <p className="text-sm text-gray-500">تعديلات</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {stats.recentActivity.reduce((acc, a) => acc + a.updates, 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-red-500">
              <p className="text-sm text-gray-500">حذف</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {stats.recentActivity.reduce((acc, a) => acc + a.deletions, 0)}
              </p>
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">سجل النشاط اليومي</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-center">إضافات</th>
                    <th className="p-3 text-center">تعديلات</th>
                    <th className="p-3 text-center">حذف</th>
                    <th className="p-3 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((activity, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">{new Date(activity.date).toLocaleDateString('ar-SA')}</td>
                      <td className="p-3 text-center text-green-600">{activity.additions}</td>
                      <td className="p-3 text-center text-blue-600">{activity.updates}</td>
                      <td className="p-3 text-center text-red-600">{activity.deletions}</td>
                      <td className="p-3 text-center font-bold">
                        {activity.additions + activity.updates + activity.deletions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Branches Report */}
      {selectedReport === 'branches' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {stats.branches.map((branch, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">{branch.name}</h3>
                  <span className="text-2xl font-bold text-purple-600">{branch.count}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-purple-500 to-pink-500"
                    style={{ width: `${(branch.count / stats.totalMembers) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {Math.round((branch.count / stats.totalMembers) * 100)}% من إجمالي العائلة
                </p>
              </div>
            ))}
          </div>

          {/* Branch Comparison */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4">مقارنة الفروع</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-right">الفرع</th>
                    <th className="p-3 text-center">عدد الأعضاء</th>
                    <th className="p-3 text-center">النسبة</th>
                    <th className="p-3 text-center">التمثيل البياني</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.branches.map((branch, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{branch.name}</td>
                      <td className="p-3 text-center">{branch.count}</td>
                      <td className="p-3 text-center">
                        {Math.round((branch.count / stats.totalMembers) * 100)}%
                      </td>
                      <td className="p-3">
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(branch.count / stats.totalMembers) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
