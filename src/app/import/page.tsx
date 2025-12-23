'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Merge,
  ArrowLeftRight,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  parseJSON,
  parseCSV,
  prepareImport,
  mergeMembers,
  MergeStrategy,
} from '@/lib/import-utils';
import { FamilyMember, ImportConflict, FieldConflict, ValidationError } from '@/lib/types';

type ImportStep = 'upload' | 'preview' | 'conflicts' | 'complete';

interface ConflictResolution {
  conflictIndex: number;
  action: 'KEEP_EXISTING' | 'USE_IMPORTED' | 'MERGE' | 'SKIP';
  mergedMember?: FamilyMember;
}

export default function ImportPage() {
  const { session } = useAuth();

  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');

  // Import data
  const [importedMembers, setImportedMembers] = useState<Partial<FamilyMember>[]>([]);
  const [newMembers, setNewMembers] = useState<Partial<FamilyMember>[]>([]);
  const [conflicts, setConflicts] = useState<ImportConflict[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; member: Partial<FamilyMember>; errors: ValidationError[] }[]>([]);
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);

  // UI state
  const [expandedConflicts, setExpandedConflicts] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [allMembers, setAllMembers] = useState<FamilyMember[]>([]);

  // Fetch members from API
  useEffect(() => {
    async function fetchMembers() {
      try {
        const headers: HeadersInit = {};
        if (session?.token) {
          headers['Authorization'] = `Bearer ${session.token}`;
        }
        const response = await fetch('/api/members?limit=500', { headers });
        if (response.ok) {
          const result = await response.json();
          setAllMembers(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      }
    }
    fetchMembers();
  }, [session?.token]);

  // Handle file drop/select
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError('');

    try {
      const content = await selectedFile.text();
      setFileContent(content);

      // Determine file type and parse
      const isJSON = selectedFile.name.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[');

      const result = isJSON ? parseJSON(content) : parseCSV(content);

      if (result.error) {
        setParseError(result.error);
        return;
      }

      if (result.members.length === 0) {
        setParseError('لم يتم العثور على أعضاء في الملف');
        return;
      }

      setImportedMembers(result.members);

      // Prepare import (detect conflicts)
      const prepared = prepareImport(result.members, allMembers);
      setNewMembers(prepared.newMembers);
      setConflicts(prepared.conflicts);
      setValidationErrors(prepared.errors);

      // Initialize resolutions
      setResolutions(prepared.conflicts.map((_, i) => ({
        conflictIndex: i,
        action: 'SKIP'
      })));

      setCurrentStep('preview');
    } catch (error) {
      setParseError('خطأ في قراءة الملف: ' + (error as Error).message);
    }
  }, [allMembers]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Toggle conflict expansion
  const toggleConflict = (index: number) => {
    setExpandedConflicts(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Update resolution
  const updateResolution = (conflictIndex: number, action: ConflictResolution['action']) => {
    setResolutions(prev =>
      prev.map(r =>
        r.conflictIndex === conflictIndex
          ? { ...r, action }
          : r
      )
    );
  };

  // Custom merge for a specific field
  const updateMergedField = (conflictIndex: number, field: string, useImported: boolean) => {
    const conflict = conflicts[conflictIndex];
    const currentResolution = resolutions[conflictIndex];

    const existingValue = conflict.existingMember[field as keyof FamilyMember];
    const importedValue = conflict.importedData[field as keyof FamilyMember];

    const merged = currentResolution.mergedMember || { ...conflict.existingMember };
    (merged as any)[field] = useImported ? importedValue : existingValue;

    setResolutions(prev =>
      prev.map(r =>
        r.conflictIndex === conflictIndex
          ? { ...r, action: 'MERGE', mergedMember: merged as FamilyMember }
          : r
      )
    );
  };

  // Apply all resolutions
  const applyImport = async () => {
    setIsProcessing(true);

    try {
      // Here you would send to API to persist changes
      // For now, we'll save to localStorage as a demonstration

      const existingMembers = [...allMembers];
      const importResults = {
        added: [] as FamilyMember[],
        updated: [] as FamilyMember[],
        skipped: [] as { reason: string; member: Partial<FamilyMember> }[]
      };

      // Add new members
      for (const member of newMembers) {
        // Generate ID if missing
        if (!member.id) {
          const maxId = Math.max(...existingMembers.map(m => parseInt(m.id.slice(1))));
          member.id = `P${String(maxId + 1).padStart(3, '0')}`;
        }

        importResults.added.push(member as FamilyMember);
      }

      // Process conflict resolutions
      for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        const resolution = resolutions[i];

        switch (resolution.action) {
          case 'KEEP_EXISTING':
            importResults.skipped.push({
              reason: 'الاحتفاظ بالبيانات الحالية',
              member: conflict.importedData
            });
            break;

          case 'USE_IMPORTED':
            const updatedMember = mergeMembers(
              conflict.existingMember,
              conflict.importedData,
              'USE_IMPORTED'
            );
            importResults.updated.push(updatedMember);
            break;

          case 'MERGE':
            if (resolution.mergedMember) {
              importResults.updated.push(resolution.mergedMember);
            }
            break;

          case 'SKIP':
          default:
            importResults.skipped.push({
              reason: 'تم التخطي',
              member: conflict.importedData
            });
        }
      }

      // Save to localStorage for demonstration
      const storedImports = JSON.parse(localStorage.getItem('alshaye_imports') || '[]');
      storedImports.push({
        date: new Date().toISOString(),
        fileName: file?.name,
        results: importResults
      });
      localStorage.setItem('alshaye_imports', JSON.stringify(storedImports));

      // Store the actual imported members
      const currentStored = JSON.parse(localStorage.getItem('alshaye_new_members') || '[]');
      localStorage.setItem('alshaye_new_members', JSON.stringify([
        ...currentStored,
        ...importResults.added,
        ...importResults.updated
      ]));

      setCurrentStep('complete');
    } catch (error) {
      console.error('Import failed:', error);
      alert('حدث خطأ أثناء الاستيراد');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset import
  const resetImport = () => {
    setCurrentStep('upload');
    setFile(null);
    setFileContent('');
    setParseError('');
    setImportedMembers([]);
    setNewMembers([]);
    setConflicts([]);
    setValidationErrors([]);
    setResolutions([]);
    setExpandedConflicts([]);
  };

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
              <h1 className="text-2xl font-bold">استيراد البيانات</h1>
              <p className="text-white/80 text-sm">Import & Merge Family Data</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { step: 'upload', label: 'رفع الملف', labelEn: 'Upload' },
            { step: 'preview', label: 'معاينة', labelEn: 'Preview' },
            { step: 'conflicts', label: 'التعارضات', labelEn: 'Conflicts' },
            { step: 'complete', label: 'اكتمل', labelEn: 'Complete' },
          ].map(({ step, label }, index) => {
            const steps = ['upload', 'preview', 'conflicts', 'complete'];
            const currentIndex = steps.indexOf(currentStep);
            const stepIndex = steps.indexOf(step);

            return (
              <div
                key={step}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentStep === step
                    ? 'bg-[#1E3A5F] text-white'
                    : stepIndex < currentIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white text-gray-400'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  currentStep === step
                    ? 'bg-white text-[#1E3A5F]'
                    : stepIndex < currentIndex
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200'
                }`}>
                  {stepIndex < currentIndex ? <Check className="w-4 h-4" /> : index + 1}
                </span>
                <span className="hidden sm:block">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-[#1E3A5F] transition-colors"
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-700 mb-2">
                اسحب الملف هنا أو اضغط للاختيار
              </h2>
              <p className="text-gray-500 mb-6">
                الصيغ المدعومة: JSON, CSV
              </p>

              <input
                type="file"
                accept=".json,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5" />
                اختر ملف
              </label>
            </div>

            {parseError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <XCircle className="w-5 h-5" />
                {parseError}
              </div>
            )}

            {/* Supported formats info */}
            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FileJson className="w-8 h-8 text-blue-500" />
                  <span className="font-bold">JSON</span>
                </div>
                <p className="text-sm text-gray-600">
                  ملفات JSON من التصدير السابق أو أي صيغة JSON صالحة تحتوي على مصفوفة أعضاء
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FileSpreadsheet className="w-8 h-8 text-green-500" />
                  <span className="font-bold">CSV</span>
                </div>
                <p className="text-sm text-gray-600">
                  ملفات CSV من Excel أو Google Sheets مع رؤوس أعمدة عربية أو إنجليزية
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">ملخص الاستيراد</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{importedMembers.length}</div>
                  <div className="text-sm text-gray-600">إجمالي السجلات</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{newMembers.length}</div>
                  <div className="text-sm text-gray-600">أعضاء جدد</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">{conflicts.length}</div>
                  <div className="text-sm text-gray-600">تعارضات</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-600">{validationErrors.length}</div>
                  <div className="text-sm text-gray-600">أخطاء</div>
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  أخطاء التحقق ({validationErrors.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-auto">
                  {validationErrors.map(({ row, member, errors }) => (
                    <div key={row} className="p-3 bg-red-50 rounded-lg">
                      <div className="font-bold text-red-800 mb-1">
                        سطر {row}: {member.firstName || 'بدون اسم'}
                      </div>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {errors.map((err, i) => (
                          <li key={i}>{err.message}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Members Preview */}
            {newMembers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  أعضاء جدد ({newMembers.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {newMembers.slice(0, 10).map((member, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border-r-4 ${
                        member.gender === 'Male' ? 'border-blue-500 bg-blue-50' : 'border-pink-500 bg-pink-50'
                      }`}
                    >
                      <div className="font-bold">{member.fullNameAr || member.firstName}</div>
                      <div className="text-sm text-gray-500">
                        {member.id} | الجيل {member.generation} | {member.branch || 'بدون فرع'}
                      </div>
                    </div>
                  ))}
                  {newMembers.length > 10 && (
                    <div className="text-center text-gray-500 py-2">
                      ... و {newMembers.length - 10} عضو آخر
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={resetImport}
                className="px-6 py-3 text-gray-600 hover:text-gray-800"
              >
                البدء من جديد
              </button>
              <button
                onClick={() => setCurrentStep(conflicts.length > 0 ? 'conflicts' : 'complete')}
                className="px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors"
              >
                {conflicts.length > 0 ? 'التالي: حل التعارضات' : 'استيراد البيانات'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Conflicts Resolution */}
        {currentStep === 'conflicts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  حل التعارضات ({conflicts.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setResolutions(resolutions.map(r => ({ ...r, action: 'KEEP_EXISTING' })))}
                    className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    الاحتفاظ بالكل
                  </button>
                  <button
                    onClick={() => setResolutions(resolutions.map(r => ({ ...r, action: 'USE_IMPORTED' })))}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    استخدام المستورد
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {conflicts.map((conflict, index) => {
                  const isExpanded = expandedConflicts.includes(index);
                  const resolution = resolutions[index];

                  return (
                    <div
                      key={index}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Conflict header */}
                      <button
                        onClick={() => toggleConflict(index)}
                        className="w-full flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">سطر {conflict.rowNumber}</span>
                          <span className="font-bold">{conflict.existingMember.fullNameAr || conflict.existingMember.firstName}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            conflict.conflictType === 'DUPLICATE_ID'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {conflict.conflictType === 'DUPLICATE_ID' ? 'نفس الرقم' : 'اسم مشابه'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {conflict.fieldConflicts.length} حقول متعارضة
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 text-sm rounded-lg ${
                            resolution.action === 'KEEP_EXISTING' ? 'bg-gray-200' :
                            resolution.action === 'USE_IMPORTED' ? 'bg-blue-200 text-blue-800' :
                            resolution.action === 'MERGE' ? 'bg-green-200 text-green-800' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {resolution.action === 'KEEP_EXISTING' ? 'احتفاظ' :
                             resolution.action === 'USE_IMPORTED' ? 'استخدام المستورد' :
                             resolution.action === 'MERGE' ? 'دمج' : 'تخطي'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>

                      {/* Conflict details */}
                      {isExpanded && (
                        <div className="p-4 space-y-4">
                          {/* Quick actions */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <button
                              onClick={() => updateResolution(index, 'KEEP_EXISTING')}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                resolution.action === 'KEEP_EXISTING'
                                  ? 'bg-gray-800 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              <X className="w-4 h-4" />
                              الاحتفاظ بالحالي
                            </button>
                            <button
                              onClick={() => updateResolution(index, 'USE_IMPORTED')}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                resolution.action === 'USE_IMPORTED'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                              }`}
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                              استخدام المستورد
                            </button>
                            <button
                              onClick={() => updateResolution(index, 'SKIP')}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                resolution.action === 'SKIP'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 hover:bg-red-200 text-red-700'
                              }`}
                            >
                              <X className="w-4 h-4" />
                              تخطي
                            </button>
                          </div>

                          {/* Field-by-field comparison */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                              <Merge className="w-4 h-4" />
                              مقارنة الحقول (اضغط لاختيار القيمة)
                            </h4>
                            <div className="space-y-2">
                              {conflict.fieldConflicts.map((fc, fcIndex) => (
                                <div key={fcIndex} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                                  <span className="w-24 text-sm text-gray-500 font-medium">{fc.field}</span>
                                  <button
                                    onClick={() => updateMergedField(index, fc.field, false)}
                                    className={`flex-1 p-2 text-sm rounded-lg text-right transition-colors ${
                                      resolution.action === 'KEEP_EXISTING' ||
                                      (resolution.mergedMember && (resolution.mergedMember as any)[fc.field] === fc.existingValue)
                                        ? 'bg-green-100 border-2 border-green-500'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  >
                                    <span className="text-xs text-gray-500 block mb-1">الحالي</span>
                                    {String(fc.existingValue ?? '-')}
                                  </button>
                                  <button
                                    onClick={() => updateMergedField(index, fc.field, true)}
                                    className={`flex-1 p-2 text-sm rounded-lg text-right transition-colors ${
                                      resolution.action === 'USE_IMPORTED' ||
                                      (resolution.mergedMember && (resolution.mergedMember as any)[fc.field] === fc.importedValue)
                                        ? 'bg-blue-100 border-2 border-blue-500'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                  >
                                    <span className="text-xs text-gray-500 block mb-1">المستورد</span>
                                    {String(fc.importedValue ?? '-')}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('preview')}
                className="px-6 py-3 text-gray-600 hover:text-gray-800"
              >
                السابق
              </button>
              <button
                onClick={applyImport}
                disabled={isProcessing}
                className="flex items-center gap-2 px-8 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    جاري الاستيراد...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    تطبيق الاستيراد
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">تم الاستيراد بنجاح!</h2>
            <p className="text-gray-600 mb-8">
              تم استيراد {newMembers.length} عضو جديد ومعالجة {conflicts.length} تعارض
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={resetImport}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <RefreshCw className="w-5 h-5" />
                استيراد آخر
              </button>
              <Link
                href="/tree"
                className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87]"
              >
                عرض الشجرة
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
