'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Printer,
  Check,
  ChevronDown,
  ChevronUp,
  TreePine,
  List,
  Layers,
  Eye,
  Filter,
} from 'lucide-react';
import { familyMembers, getStatistics } from '@/lib/data';
import {
  ALL_EXPORT_FIELDS,
  FIELD_CATEGORIES,
  exportToJSON,
  exportToCSV,
  exportToHTML,
  exportToReadableText,
  downloadFile,
  getExportFilename,
  getMimeType,
} from '@/lib/export-utils';
import { ExportField, ExportFormat, ExportFilters } from '@/lib/types';

type ViewMode = 'format' | 'fields' | 'filters' | 'preview';

export default function ExportPage() {
  const stats = getStatistics();

  // Export configuration state
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('JSON');
  const [fields, setFields] = useState<ExportField[]>(ALL_EXPORT_FIELDS);
  const [includeTree, setIncludeTree] = useState(true);
  const [groupByGeneration, setGroupByGeneration] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<ExportFilters>({
    generations: [],
    branches: [],
    genders: [],
    status: [],
  });

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['identity', 'family']);
  const [previewMode, setPreviewMode] = useState<'list' | 'tree' | 'raw'>('list');
  const [isExporting, setIsExporting] = useState(false);

  // Get unique values for filters
  const uniqueBranches = useMemo(() =>
    [...new Set(familyMembers.map(m => m.branch).filter(Boolean))] as string[],
    []
  );

  const generations = useMemo(() =>
    [...new Set(familyMembers.map(m => m.generation))].sort((a, b) => a - b),
    []
  );

  // Filter members based on current filters
  const filteredMembers = useMemo(() => {
    return familyMembers.filter(member => {
      if (filters.generations?.length && !filters.generations.includes(member.generation)) {
        return false;
      }
      if (filters.branches?.length && !filters.branches.includes(member.branch || '')) {
        return false;
      }
      if (filters.genders?.length && !filters.genders.includes(member.gender)) {
        return false;
      }
      if (filters.status?.length && !filters.status.includes(member.status)) {
        return false;
      }
      return true;
    });
  }, [filters]);

  // Toggle field selection
  const toggleField = (key: string) => {
    setFields(prev =>
      prev.map(f => f.key === key ? { ...f, selected: !f.selected } : f)
    );
  };

  // Select/deselect all in category
  const toggleCategory = (category: string, selected: boolean) => {
    setFields(prev =>
      prev.map(f => f.category === category ? { ...f, selected } : f)
    );
  };

  // Check if all in category are selected
  const isCategorySelected = (category: string) => {
    const categoryFields = fields.filter(f => f.category === category);
    return categoryFields.every(f => f.selected);
  };

  // Toggle category expansion
  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Export handlers
  const handleExport = async () => {
    setIsExporting(true);

    try {
      const options = {
        format: selectedFormat,
        fields: fields,
        includeTree,
        groupByGeneration,
        filters,
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (selectedFormat) {
        case 'JSON':
          content = exportToJSON(filteredMembers, options);
          filename = getExportFilename('JSON');
          mimeType = getMimeType('JSON');
          break;
        case 'CSV':
          content = exportToCSV(filteredMembers, options);
          filename = getExportFilename('CSV');
          mimeType = getMimeType('CSV');
          break;
        case 'PDF':
          content = exportToHTML(filteredMembers, options);
          filename = getExportFilename('PDF');
          mimeType = getMimeType('PDF');
          break;
        default:
          content = exportToReadableText(filteredMembers);
          filename = getExportFilename('TXT');
          mimeType = getMimeType('TXT');
      }

      downloadFile(content, filename, mimeType);
    } catch (error) {
      console.error('Export failed:', error);
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  // Open print preview for PDF
  const handlePrint = () => {
    const options = {
      format: 'PDF' as ExportFormat,
      fields: fields,
      includeTree,
      groupByGeneration,
      filters,
    };

    const html = exportToHTML(filteredMembers, options);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const selectedFieldCount = fields.filter(f => f.selected).length;

  const formatOptions = [
    {
      format: 'JSON' as ExportFormat,
      icon: FileJson,
      title: 'JSON',
      description: 'للنسخ الاحتياطي والاستيراد',
      descriptionEn: 'For backup & import',
    },
    {
      format: 'CSV' as ExportFormat,
      icon: FileSpreadsheet,
      title: 'CSV',
      description: 'لبرامج الجداول',
      descriptionEn: 'For spreadsheets',
    },
    {
      format: 'PDF' as ExportFormat,
      icon: Printer,
      title: 'PDF / طباعة',
      description: 'للطباعة والمشاركة',
      descriptionEn: 'For printing & sharing',
    },
    {
      format: 'EXCEL' as ExportFormat,
      icon: FileText,
      title: 'نص مقروء',
      description: 'للقراءة البشرية',
      descriptionEn: 'Human-readable text',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowRight className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">تصدير البيانات</h1>
              <p className="text-white/80 text-sm">Export Family Tree Data</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { step: 1, label: 'الصيغة', labelEn: 'Format' },
            { step: 2, label: 'الحقول', labelEn: 'Fields' },
            { step: 3, label: 'الفلاتر', labelEn: 'Filters' },
            { step: 4, label: 'معاينة', labelEn: 'Preview' },
          ].map(({ step, label, labelEn }) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                currentStep === step
                  ? 'bg-[#1E3A5F] text-white'
                  : currentStep > step
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                currentStep === step
                  ? 'bg-white text-[#1E3A5F]'
                  : currentStep > step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200'
              }`}>
                {currentStep > step ? <Check className="w-4 h-4" /> : step}
              </span>
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        {/* Summary bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">الصيغة:</span>
              <span className="font-bold">{selectedFormat}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-gray-500">الحقول:</span>
              <span className="font-bold">{selectedFieldCount} من {fields.length}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-gray-500">الأعضاء:</span>
              <span className="font-bold">{filteredMembers.length} من {familyMembers.length}</span>
            </div>
            {includeTree && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-2 text-green-600">
                  <TreePine className="w-4 h-4" />
                  <span>الشجرة الهرمية</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 1: Format Selection */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">اختر صيغة التصدير</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {formatOptions.map(({ format, icon: Icon, title, description, descriptionEn }) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`p-6 rounded-xl border-2 transition-all text-right ${
                    selectedFormat === format
                      ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-10 h-10 mb-4 ${
                    selectedFormat === format ? 'text-[#1E3A5F]' : 'text-gray-400'
                  }`} />
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm">{description}</p>
                  <p className="text-gray-400 text-xs">{descriptionEn}</p>
                </button>
              ))}
            </div>

            {/* Tree structure options */}
            <div className="border-t pt-6">
              <h3 className="font-bold text-gray-700 mb-4">خيارات الهيكل</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTree}
                    onChange={(e) => setIncludeTree(e.target.checked)}
                    className="w-5 h-5 rounded text-[#1E3A5F]"
                  />
                  <TreePine className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="font-medium">تضمين الشجرة الهرمية</span>
                    <p className="text-sm text-gray-500">Include hierarchical tree structure</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByGeneration}
                    onChange={(e) => setGroupByGeneration(e.target.checked)}
                    className="w-5 h-5 rounded text-[#1E3A5F]"
                  />
                  <Layers className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="font-medium">تجميع حسب الجيل</span>
                    <p className="text-sm text-gray-500">Group members by generation</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
              >
                التالي: اختيار الحقول
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Field Selection */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">اختر الحقول للتصدير</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setFields(fields.map(f => ({ ...f, selected: true })))}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  تحديد الكل
                </button>
                <button
                  onClick={() => setFields(fields.map(f => ({ ...f, selected: false })))}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  إلغاء الكل
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(FIELD_CATEGORIES).map(([category, { label, labelAr }]) => {
                const categoryFields = fields.filter(f => f.category === category);
                const selectedCount = categoryFields.filter(f => f.selected).length;
                const isExpanded = expandedCategories.includes(category);

                return (
                  <div key={category} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategoryExpand(category)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isCategorySelected(category)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCategory(category, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded text-[#1E3A5F]"
                        />
                        <span className="font-bold">{labelAr}</span>
                        <span className="text-gray-500 text-sm">({label})</span>
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                          {selectedCount}/{categoryFields.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categoryFields.map(field => (
                          <label
                            key={field.key}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              field.selected ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={field.selected}
                              onChange={() => toggleField(field.key)}
                              className="w-4 h-4 rounded text-[#1E3A5F]"
                            />
                            <div>
                              <span className="font-medium">{field.labelAr}</span>
                              <span className="text-gray-400 text-sm mr-2">({field.label})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 text-gray-600 hover:text-gray-800"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
              >
                التالي: الفلاتر
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Filters */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">تصفية البيانات</h2>
              <button
                onClick={() => setFilters({ generations: [], branches: [], genders: [], status: [] })}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إزالة جميع الفلاتر
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Generations filter */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">الأجيال</h3>
                <div className="flex flex-wrap gap-2">
                  {generations.map(gen => (
                    <button
                      key={gen}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          generations: prev.generations?.includes(gen)
                            ? prev.generations.filter(g => g !== gen)
                            : [...(prev.generations || []), gen]
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filters.generations?.includes(gen)
                          ? 'bg-[#1E3A5F] text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      الجيل {gen}
                    </button>
                  ))}
                </div>
              </div>

              {/* Branches filter */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">الفروع</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueBranches.map(branch => (
                    <button
                      key={branch}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          branches: prev.branches?.includes(branch)
                            ? prev.branches.filter(b => b !== branch)
                            : [...(prev.branches || []), branch]
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filters.branches?.includes(branch)
                          ? 'bg-[#1E3A5F] text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender filter */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">الجنس</h3>
                <div className="flex gap-2">
                  {['Male', 'Female'].map(gender => (
                    <button
                      key={gender}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          genders: prev.genders?.includes(gender)
                            ? prev.genders.filter(g => g !== gender)
                            : [...(prev.genders || []), gender]
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filters.genders?.includes(gender)
                          ? gender === 'Male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {gender === 'Male' ? 'ذكر' : 'أنثى'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3">الحالة</h3>
                <div className="flex gap-2">
                  {['Living', 'Deceased'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status?.includes(status)
                            ? prev.status.filter(s => s !== status)
                            : [...(prev.status || []), status]
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        filters.status?.includes(status)
                          ? status === 'Living' ? 'bg-green-500 text-white' : 'bg-gray-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'Living' ? 'على قيد الحياة' : 'متوفى'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter results preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter className="w-5 h-5" />
                <span>
                  سيتم تصدير <strong className="text-[#1E3A5F]">{filteredMembers.length}</strong> عضو
                  من أصل {familyMembers.length}
                </span>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 text-gray-600 hover:text-gray-800"
              >
                السابق
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
              >
                التالي: معاينة
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview & Export */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Preview mode selector */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">معاينة التصدير</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewMode('list')}
                    className={`p-2 rounded-lg ${previewMode === 'list' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-100'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('tree')}
                    className={`p-2 rounded-lg ${previewMode === 'tree' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-100'}`}
                  >
                    <TreePine className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('raw')}
                    className={`p-2 rounded-lg ${previewMode === 'raw' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-100'}`}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preview content */}
            <div className="bg-white rounded-xl shadow-sm p-6 max-h-96 overflow-auto">
              {previewMode === 'list' && (
                <div className="space-y-2">
                  {filteredMembers.slice(0, 10).map(member => (
                    <div
                      key={member.id}
                      className={`p-3 rounded-lg border-r-4 ${
                        member.gender === 'Male' ? 'border-blue-500 bg-blue-50' : 'border-pink-500 bg-pink-50'
                      }`}
                    >
                      <div className="font-bold">{member.fullNameAr || member.firstName}</div>
                      <div className="text-sm text-gray-500">
                        {member.id} | الجيل {member.generation} | {member.branch}
                      </div>
                    </div>
                  ))}
                  {filteredMembers.length > 10 && (
                    <div className="text-center text-gray-500 py-4">
                      ... و {filteredMembers.length - 10} عضو آخر
                    </div>
                  )}
                </div>
              )}

              {previewMode === 'tree' && (
                <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700" dir="ltr">
                  {exportToReadableText(filteredMembers.slice(0, 20))}
                </pre>
              )}

              {previewMode === 'raw' && (
                <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-auto" dir="ltr">
                  {selectedFormat === 'JSON'
                    ? exportToJSON(filteredMembers.slice(0, 5), { format: selectedFormat, fields, includeTree, groupByGeneration })
                    : selectedFormat === 'CSV'
                    ? exportToCSV(filteredMembers.slice(0, 5), { format: selectedFormat, fields, includeTree, groupByGeneration })
                    : '...'
                  }
                </pre>
              )}
            </div>

            {/* Export actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800"
                >
                  السابق
                </button>

                <div className="flex-1" />

                {selectedFormat === 'PDF' && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Printer className="w-5 h-5" />
                    <span>طباعة مباشرة</span>
                  </button>
                )}

                <button
                  onClick={handleExport}
                  disabled={isExporting || selectedFieldCount === 0}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>جاري التصدير...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>تحميل {selectedFormat}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
