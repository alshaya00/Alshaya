'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { FamilyMember } from '@/lib/data';
import { calculateAge, getGenerationColor, getStatusBadge } from '@/lib/utils';
import { Search, Filter, Users, ChevronDown, ChevronUp, Eye, GitBranch } from 'lucide-react';

type SortField = 'id' | 'firstName' | 'generation' | 'birthYear';
type SortOrder = 'asc' | 'desc';

export default function RegistryPage() {
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);
  const [gen2Branches, setGen2Branches] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [generationFilter, setGenerationFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [lineageFilter, setLineageFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/members?limit=500');
        const data = await res.json();
        const members = data.data || [];
        setAllMembers(members);
        // Get Gen 2 branches (generation === 2)
        setGen2Branches(members.filter((m: FamilyMember) => m.generation === 2));
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const generations = [...new Set(allMembers.map((m) => m.generation))].sort();
  const branches = [...new Set(allMembers.map((m) => m.branch).filter(Boolean))];

  const filteredAndSortedMembers = useMemo(() => {
    let result = [...allMembers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.firstName.toLowerCase().includes(term) ||
          m.fullNameAr?.toLowerCase().includes(term) ||
          m.fullNameEn?.toLowerCase().includes(term) ||
          m.id.toLowerCase().includes(term)
      );
    }

    // Gender filter
    if (genderFilter !== 'all') {
      result = result.filter((m) => m.gender === genderFilter);
    }

    // Generation filter
    if (generationFilter !== 'all') {
      result = result.filter((m) => m.generation === parseInt(generationFilter));
    }

    // Branch filter
    if (branchFilter !== 'all') {
      result = result.filter((m) => m.branch === branchFilter);
    }

    // Lineage filter (Gen 2 branch)
    if (lineageFilter !== 'all') {
      result = result.filter((m) => m.lineageBranchId === lineageFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'firstName':
          comparison = a.firstName.localeCompare(b.firstName, 'ar');
          break;
        case 'generation':
          comparison = a.generation - b.generation;
          break;
        case 'birthYear':
          comparison = (a.birthYear || 0) - (b.birthYear || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allMembers, searchTerm, genderFilter, generationFilter, branchFilter, lineageFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-24 lg:pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <Users className="text-blue-600" size={36} />
            سجل أفراد العائلة
          </h1>
          <p className="text-gray-600 mt-2">Family Registry - {allMembers.length} عضو</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                بحث / Search
              </label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم..."
                  className="w-full pr-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lineage Filter (Gen 2 Branch) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <GitBranch size={14} className="inline ml-1" />
                السلالة
              </label>
              <select
                value={lineageFilter}
                onChange={(e) => setLineageFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              >
                <option value="all">كل السلالات</option>
                {gen2Branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    فرع {branch.firstName}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              >
                <option value="all">الكل</option>
                <option value="Male">ذكور</option>
                <option value="Female">إناث</option>
              </select>
            </div>

            {/* Generation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
              <select
                value={generationFilter}
                onChange={(e) => setGenerationFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              >
                <option value="all">الكل</option>
                {generations.map((gen) => (
                  <option key={gen} value={gen}>
                    الجيل {gen}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              >
                <option value="all">الكل</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch!}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            عرض {filteredAndSortedMembers.length} من {allMembers.length} عضو
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="p-4 text-right cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-1">
                      الرقم <SortIcon field="id" />
                    </div>
                  </th>
                  <th
                    className="p-4 text-right cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-1">
                      الاسم <SortIcon field="firstName" />
                    </div>
                  </th>
                  <th className="p-4 text-right">الاسم الكامل</th>
                  <th className="p-4 text-center">الجنس</th>
                  <th
                    className="p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('generation')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      الجيل <SortIcon field="generation" />
                    </div>
                  </th>
                  <th
                    className="p-4 text-center cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleSort('birthYear')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      سنة الميلاد <SortIcon field="birthYear" />
                    </div>
                  </th>
                  <th className="p-4 text-center">السلالة</th>
                  <th className="p-4 text-center">الفرع</th>
                  <th className="p-4 text-center">الحالة</th>
                  <th className="p-4 text-center">عرض</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedMembers.map((member, index) => {
                  const statusBadge = getStatusBadge(member.status);
                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="p-4 font-mono text-gray-600">{member.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              member.gender === 'Male'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-pink-100 text-pink-600'
                            }`}
                          >
                            {member.gender === 'Male' ? '👨' : '👩'}
                          </span>
                          <span className="font-semibold">{member.firstName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                        {member.fullNameAr}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.gender === 'Male' ? 'badge-male' : 'badge-female'
                          }`}
                        >
                          {member.gender === 'Male' ? 'ذكر' : 'أنثى'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getGenerationColor(
                            member.generation
                          )}`}
                        >
                          {member.generation}
                        </span>
                      </td>
                      <td className="p-4 text-center text-gray-600">
                        {member.birthYear || '-'}
                        {member.birthYear && (
                          <span className="text-xs text-gray-400 block">
                            ({calculateAge(member.birthYear)} سنة)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {member.lineageBranchName ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                              فرع {member.lineageBranchName}
                            </span>
                            {member.subBranchName && member.generation > 3 && (
                              <span className="text-xs text-gray-500 mt-1">
                                ذرية {member.subBranchName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {member.generation === 1 ? 'الجذر' : '-'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center text-sm">{member.branch || '-'}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/member/${member.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye size={16} />
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredAndSortedMembers.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <p className="text-lg">لا توجد نتائج</p>
              <p className="text-sm">جرب تغيير معايير البحث</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
