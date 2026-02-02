'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Download,
  Upload,
  Save,
  Trash2,
  Plus,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpDown,
  ChevronDown,
  Edit2,
  Copy,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileDown,
  FileUp,
  Undo2,
} from 'lucide-react';
import { memberFields } from '@/config/fields';
import { useAuth } from '@/contexts/AuthContext';
import { formatMemberId } from '@/lib/utils';

// Use centralized field definitions from config
const MEMBER_FIELDS = memberFields;

interface Member {
  id: string;
  [key: string]: string | number | null | undefined;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ChangeRecord {
  row: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export default function ExcelViewPage() {
  const { session } = useAuth();
  
  // Data state
  const [members, setMembers] = useState<Member[]>([]);
  const [originalMembers, setOriginalMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Filter/search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<Member[]>([]);
  const [importErrors, setImportErrors] = useState<ValidationError[]>([]);
  const [importPreview, setImportPreview] = useState(false);

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  // Visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'firstName', 'fatherName', 'gender', 'birthYear', 'status', 'generation', 'branch', 'phone'
  ]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load members
  useEffect(() => {
    if (session?.token) {
      loadMembers();
    }
  }, [session?.token]);

  const loadMembers = async () => {
    setIsLoading(true);
    if (!session?.token) {
      console.error('No auth token available');
      setMembers([]);
      setOriginalMembers([]);
      setIsLoading(false);
      return;
    }
    
    const headers: HeadersInit = { Authorization: `Bearer ${session.token}` };
    try {
      const res = await fetch('/api/members?limit=2000', { headers });
      
      if (!res.ok) {
        console.error('API error:', res.status, res.statusText);
        setMembers([]);
        setOriginalMembers([]);
        return;
      }
      
      const data = await res.json();
      
      // Only use data.data array, not the whole response object
      const memberList = Array.isArray(data.data) ? data.data : [];
      
      console.log(`Loaded ${memberList.length} members from database`);
      setMembers(memberList);
      setOriginalMembers(JSON.parse(JSON.stringify(memberList)));
      validateAllData(memberList);
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
      setOriginalMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate all data
  const validateAllData = useCallback((data: Member[]) => {
    const errors: ValidationError[] = [];

    data.forEach((member, rowIndex) => {
      // Required field checks
      if (!member.firstName) {
        errors.push({ row: rowIndex, field: 'firstName', message: 'الاسم مطلوب', severity: 'error' });
      }
      if (!member.gender) {
        errors.push({ row: rowIndex, field: 'gender', message: 'الجنس مطلوب', severity: 'error' });
      }

      // Data type checks
      const birthYear = Number(member.birthYear);
      const deathYear = Number(member.deathYear);
      if (member.birthYear && (birthYear < 1800 || birthYear > new Date().getFullYear())) {
        errors.push({ row: rowIndex, field: 'birthYear', message: 'سنة الميلاد غير صحيحة', severity: 'error' });
      }
      if (member.deathYear && member.birthYear && deathYear < birthYear) {
        errors.push({ row: rowIndex, field: 'deathYear', message: 'سنة الوفاة قبل الميلاد', severity: 'error' });
      }

      // Consistency checks
      if (member.status === 'Deceased' && !member.deathYear) {
        errors.push({ row: rowIndex, field: 'deathYear', message: 'سنة الوفاة مطلوبة للمتوفين', severity: 'warning' });
      }
      if (member.deathYear && member.status !== 'Deceased') {
        errors.push({ row: rowIndex, field: 'status', message: 'يجب تحديث الحالة إلى متوفي', severity: 'warning' });
      }

      // Reference checks
      if (member.fatherId) {
        const fatherExists = data.some(m => m.id === member.fatherId);
        if (!fatherExists) {
          errors.push({ row: rowIndex, field: 'fatherId', message: `الأب غير موجود: ${formatMemberId(member.fatherId as string)}`, severity: 'warning' });
        }
      }

      // Email format
      if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email as string)) {
        errors.push({ row: rowIndex, field: 'email', message: 'صيغة البريد غير صحيحة', severity: 'warning' });
      }

      // Phone format
      if (member.phone && !/^[0-9+\-\s()]+$/.test(member.phone as string)) {
        errors.push({ row: rowIndex, field: 'phone', message: 'صيغة الهاتف غير صحيحة', severity: 'warning' });
      }
    });

    setValidationErrors(errors);
    return errors;
  }, []);

  // Filter and sort members
  const filteredMembers = members
    .filter(member => {
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return Object.values(member).some(val =>
          val?.toString().toLowerCase().includes(searchLower)
        );
      }
      if (filterField && filterValue) {
        const memberValue = member[filterField]?.toString().toLowerCase() || '';
        return memberValue.includes(filterValue.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Cell editing
  const startEdit = (row: number, field: string) => {
    const fieldDef = MEMBER_FIELDS.find(f => f.key === field);
    if (!fieldDef?.editable) return;

    setEditingCell({ row, field });
    setEditValue(members[row][field]?.toString() || '');
  };

  const saveEdit = () => {
    if (!editingCell) return;

    const { row, field } = editingCell;
    const oldValue = members[row][field];
    let newValue: string | number | null = editValue;

    // Type conversion
    const fieldDef = MEMBER_FIELDS.find(f => f.key === field);
    if (fieldDef?.type === 'number') {
      newValue = editValue ? parseInt(editValue) : null;
    }

    if (oldValue !== newValue) {
      const updatedMembers = [...members];
      updatedMembers[row] = { ...updatedMembers[row], [field]: newValue };
      setMembers(updatedMembers);

      // Track change
      setChanges(prev => [...prev, { row, field, oldValue, newValue }]);

      // Re-validate
      validateAllData(updatedMembers);
    }

    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, row: number, field: string) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      // Move to next cell
      const currentFieldIndex = visibleColumns.indexOf(field);
      if (currentFieldIndex < visibleColumns.length - 1) {
        startEdit(row, visibleColumns[currentFieldIndex + 1]);
      } else if (row < filteredMembers.length - 1) {
        startEdit(row + 1, visibleColumns[0]);
      }
    }
  };

  // Add new row
  const addNewRow = () => {
    const newId = `P${String(members.length + 1).padStart(4, '0')}`;
    const newMember: Member = {
      id: newId,
      firstName: '',
      fatherName: null,
      grandfatherName: null,
      greatGrandfatherName: null,
      familyName: 'آل شايع',
      fatherId: null,
      gender: 'Male',
      birthYear: null,
      deathYear: null,
      status: 'Living',
      generation: 1,
      branch: null,
      sonsCount: 0,
      daughtersCount: 0,
      phone: null,
      city: null,
      occupation: null,
      email: null,
    };
    setMembers([...members, newMember]);
    setChanges(prev => [...prev, { row: members.length, field: 'NEW', oldValue: null, newValue: newMember }]);
  };

  // Delete selected rows
  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedRows.size} صف؟`)) return;

    const updatedMembers = members.filter((_, index) => !selectedRows.has(index));
    setMembers(updatedMembers);
    setSelectedRows(new Set());
    validateAllData(updatedMembers);
  };

  // Undo all changes
  const undoAllChanges = () => {
    if (changes.length === 0) return;
    if (!confirm('هل أنت متأكد من إلغاء جميع التغييرات؟')) return;

    setMembers(JSON.parse(JSON.stringify(originalMembers)));
    setChanges([]);
    validateAllData(originalMembers);
  };

  // Save all changes
  const saveAllChanges = async () => {
    if (validationErrors.filter(e => e.severity === 'error').length > 0) {
      alert('يوجد أخطاء يجب إصلاحها قبل الحفظ');
      return;
    }

    setIsSaving(true);
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOriginalMembers(JSON.parse(JSON.stringify(members)));
      setChanges([]);
      alert('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error saving:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    const headers = visibleColumns.map(col => {
      const field = MEMBER_FIELDS.find(f => f.key === col);
      return field?.label || col;
    });

    let csv = '\ufeff' + headers.join(',') + '\n';
    filteredMembers.forEach(member => {
      const row = visibleColumns.map(col => {
        const val = member[col];
        if (val === null || val === undefined) return '';
        const strVal = val.toString();
        return strVal.includes(',') || strVal.includes('"') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
      });
      csv += row.join(',') + '\n';
    });

    downloadFile(csv, `family_members_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
  };

  const exportToExcel = () => {
    // Create a simple HTML table that Excel can open
    let html = '<html><head><meta charset="UTF-8"></head><body dir="rtl">';
    html += '<table border="1">';

    // Headers
    html += '<tr>';
    visibleColumns.forEach(col => {
      const field = MEMBER_FIELDS.find(f => f.key === col);
      html += `<th style="background:#1E3A5F;color:white;padding:8px;">${field?.label || col}</th>`;
    });
    html += '</tr>';

    // Data rows
    filteredMembers.forEach(member => {
      html += '<tr>';
      visibleColumns.forEach(col => {
        const val = member[col];
        html += `<td style="padding:4px;">${val ?? ''}</td>`;
      });
      html += '</tr>';
    });

    html += '</table></body></html>';

    downloadFile(html, `family_members_${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
  };

  const exportToJSON = () => {
    const data = JSON.stringify(filteredMembers, null, 2);
    downloadFile(data, `family_members_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Import functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          processImportData(Array.isArray(data) ? data : [data]);
        } catch {
          alert('خطأ في تحليل ملف JSON');
        }
      } else if (file.name.endsWith('.csv')) {
        processCSV(content);
      } else {
        alert('صيغة الملف غير مدعومة. استخدم JSON أو CSV');
      }
    };
    reader.readAsText(file);
  };

  const processCSV = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      alert('الملف فارغ أو لا يحتوي على بيانات');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data: Member[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const member: Member = { id: '' };

      headers.forEach((header, index) => {
        const field = MEMBER_FIELDS.find(f =>
          f.key === header || f.label === header || f.labelEn === header
        );
        if (field) {
          let value: string | number | null = values[index]?.trim() || null;
          if (field.type === 'number' && value) {
            value = parseInt(value as string) || null;
          }
          member[field.key] = value;
        }
      });

      if (!member.id) {
        member.id = `IMPORT_${Date.now()}_${i}`;
      }

      data.push(member);
    }

    processImportData(data);
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const processImportData = (data: Member[]) => {
    // Validate import data
    const errors: ValidationError[] = [];

    data.forEach((member, rowIndex) => {
      // Check required fields
      if (!member.firstName) {
        errors.push({ row: rowIndex, field: 'firstName', message: 'الاسم مطلوب', severity: 'error' });
      }
      if (!member.gender) {
        errors.push({ row: rowIndex, field: 'gender', message: 'الجنس مطلوب', severity: 'error' });
      }

      // Check for duplicates
      const existingMember = members.find(m => m.id === member.id);
      if (existingMember) {
        errors.push({ row: rowIndex, field: 'id', message: `المعرف موجود مسبقاً: ${formatMemberId(member.id)}`, severity: 'warning' });
      }

      // Validate data types
      const importBirthYear = Number(member.birthYear);
      if (member.birthYear && (importBirthYear < 1800 || importBirthYear > new Date().getFullYear())) {
        errors.push({ row: rowIndex, field: 'birthYear', message: 'سنة الميلاد غير صحيحة', severity: 'error' });
      }
    });

    setImportData(data);
    setImportErrors(errors);
    setImportPreview(true);
    setShowImportModal(true);
  };

  const confirmImport = () => {
    const criticalErrors = importErrors.filter(e => e.severity === 'error');
    if (criticalErrors.length > 0) {
      alert('يجب إصلاح الأخطاء الحمراء قبل الاستيراد');
      return;
    }

    // Merge import data
    const existingIds = new Set(members.map(m => m.id));
    const newMembers = importData.filter(m => !existingIds.has(m.id));
    const updatedMembers = importData.filter(m => existingIds.has(m.id));

    let finalMembers = [...members];

    // Add new members
    finalMembers = [...finalMembers, ...newMembers];

    // Update existing members (if user confirms)
    if (updatedMembers.length > 0) {
      if (confirm(`سيتم تحديث ${updatedMembers.length} عضو موجود. هل تريد المتابعة؟`)) {
        finalMembers = finalMembers.map(m => {
          const updated = updatedMembers.find(u => u.id === m.id);
          return updated || m;
        });
      }
    }

    setMembers(finalMembers);
    validateAllData(finalMembers);
    setShowImportModal(false);
    setImportData([]);
    setImportErrors([]);

    alert(`تم استيراد ${newMembers.length} عضو جديد${updatedMembers.length > 0 ? ` وتحديث ${updatedMembers.length} عضو` : ''}`);
  };

  // Get cell error
  const getCellError = (row: number, field: string) => {
    return validationErrors.find(e => e.row === row && e.field === field);
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin" className="hover:text-gray-700">لوحة التحكم</Link>
          <ChevronLeft className="w-4 h-4" />
          <Link href="/admin/database" className="hover:text-gray-700">قاعدة البيانات</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-gray-800">عرض Excel</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">عرض Excel للأعضاء</h1>
              <p className="text-sm text-gray-500">Excel View - تحرير واستيراد وتصدير البيانات</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {changes.length > 0 && (
              <button
                onClick={undoAllChanges}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                <Undo2 className="w-4 h-4" />
                إلغاء التغييرات ({changes.length})
              </button>
            )}
            <button
              onClick={addNewRow}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة صف
            </button>
            {selectedRows.size > 0 && (
              <button
                onClick={deleteSelectedRows}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
              >
                <Trash2 className="w-4 h-4" />
                حذف ({selectedRows.size})
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm"
            >
              <Upload className="w-4 h-4" />
              استيراد
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
              >
                <Download className="w-4 h-4" />
                تصدير
                <ChevronDown className="w-4 h-4" />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-20">
                    <button onClick={exportToCSV} className="w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center gap-2">
                      <FileDown className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={exportToExcel} className="w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center gap-2">
                      <FileDown className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={exportToJSON} className="w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center gap-2">
                      <FileDown className="w-4 h-4" /> JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={saveAllChanges}
              disabled={changes.length === 0 || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                changes.length > 0
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الكل
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في جميع الحقول..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">تصفية حسب...</option>
              {MEMBER_FIELDS.map(field => (
                <option key={field.key} value={field.key}>{field.label}</option>
              ))}
            </select>
            {filterField && (
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="قيمة التصفية..."
                className="border rounded-lg px-3 py-2 text-sm w-32"
              />
            )}
          </div>

          {/* Column selector */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm"
            >
              <MoreHorizontal className="w-4 h-4" />
              الأعمدة ({visibleColumns.length})
            </button>
            {showColumnSelector && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-20 p-3 max-h-80 overflow-auto">
                  {MEMBER_FIELDS.map(field => (
                    <label key={field.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(field.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumns([...visibleColumns, field.key]);
                          } else {
                            setVisibleColumns(visibleColumns.filter(c => c !== field.key));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{field.label}</span>
                      <span className="text-xs text-gray-400">({field.labelEn})</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Validation status */}
          <button
            onClick={() => setShowValidationPanel(!showValidationPanel)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              validationErrors.length > 0
                ? validationErrors.some(e => e.severity === 'error')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {validationErrors.length > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                {validationErrors.filter(e => e.severity === 'error').length} خطأ،{' '}
                {validationErrors.filter(e => e.severity === 'warning').length} تحذير
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                لا توجد أخطاء
              </>
            )}
          </button>

          {/* Stats */}
          <div className="text-sm text-gray-500">
            {filteredMembers.length} من {members.length} عضو
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      {showValidationPanel && validationErrors.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border-r-4 border-yellow-400">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              مشاكل في البيانات
            </h3>
            <button onClick={() => setShowValidationPanel(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-40 overflow-auto space-y-2">
            {validationErrors.slice(0, 20).map((error, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 rounded text-sm ${
                  error.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                {error.severity === 'error' ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>صف {error.row + 1}:</span>
                <span className="font-medium">{MEMBER_FIELDS.find(f => f.key === error.field)?.label}</span>
                <span>- {error.message}</span>
              </div>
            ))}
            {validationErrors.length > 20 && (
              <div className="text-sm text-gray-500 text-center">
                و {validationErrors.length - 20} مشكلة أخرى...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excel Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-100">
                {/* Select all */}
                <th className="p-2 border-b sticky right-0 bg-gray-100 z-10 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredMembers.length && filteredMembers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(new Set(filteredMembers.map((_, i) => i)));
                      } else {
                        setSelectedRows(new Set());
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                {/* Row number */}
                <th className="p-2 border-b w-12 text-center text-xs text-gray-500">#</th>
                {/* Columns */}
                {visibleColumns.map(col => {
                  const field = MEMBER_FIELDS.find(f => f.key === col);
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="p-2 border-b cursor-pointer hover:bg-gray-200 transition-colors text-right"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold">{field?.label}</span>
                        <span className="text-xs text-gray-400">({field?.labelEn})</span>
                        {sortField === col && (
                          <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, rowIndex) => (
                <tr
                  key={member.id}
                  className={`hover:bg-blue-50 ${selectedRows.has(rowIndex) ? 'bg-blue-100' : ''}`}
                >
                  {/* Checkbox */}
                  <td className="p-2 border-b sticky right-0 bg-white z-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRows);
                        if (e.target.checked) {
                          newSelected.add(rowIndex);
                        } else {
                          newSelected.delete(rowIndex);
                        }
                        setSelectedRows(newSelected);
                      }}
                      className="w-4 h-4"
                    />
                  </td>
                  {/* Row number */}
                  <td className="p-2 border-b text-center text-xs text-gray-400">{rowIndex + 1}</td>
                  {/* Data cells */}
                  {visibleColumns.map(col => {
                    const field = MEMBER_FIELDS.find(f => f.key === col);
                    const isEditing = editingCell?.row === rowIndex && editingCell?.field === col;
                    const error = getCellError(rowIndex, col);
                    const value = member[col];

                    return (
                      <td
                        key={col}
                        className={`p-1 border-b relative ${
                          error
                            ? error.severity === 'error'
                              ? 'bg-red-50 border-red-300'
                              : 'bg-yellow-50 border-yellow-300'
                            : ''
                        }`}
                        onDoubleClick={() => field?.editable && startEdit(rowIndex, col)}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            {field?.type === 'select' ? (
                              <select
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, col)}
                                autoFocus
                                className="w-full p-1 border rounded text-sm"
                              >
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field?.type === 'number' ? 'number' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, col)}
                                autoFocus
                                className="w-full p-1 border rounded text-sm"
                              />
                            )}
                            <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-100 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`p-1 min-h-[28px] text-sm ${field?.editable ? 'cursor-cell hover:bg-gray-100' : 'cursor-default'}`}
                          >
                            {field?.type === 'select' && value?.toUpperCase() === 'MALE' ? 'ذكر' :
                             field?.type === 'select' && value?.toUpperCase() === 'FEMALE' ? 'أنثى' :
                             field?.type === 'select' && value === 'Living' ? 'حي' :
                             field?.type === 'select' && value === 'Deceased' ? 'متوفي' :
                             value ?? '-'}
                            {error && (
                              <span className="absolute top-0 left-0 text-xs" title={error.message}>
                                {error.severity === 'error' ? '🔴' : '🟡'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بيانات للعرض</p>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div>
          انقر مرتين على خلية للتعديل • Tab للانتقال للخلية التالية • Enter للحفظ • Escape للإلغاء
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-200 rounded" /> خطأ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-200 rounded" /> تحذير
          </span>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                معاينة الاستيراد
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              {/* Import stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importData.length}</div>
                  <div className="text-sm text-gray-600">إجمالي الصفوف</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importErrors.filter(e => e.severity === 'error').length}
                  </div>
                  <div className="text-sm text-gray-600">أخطاء</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {importErrors.filter(e => e.severity === 'warning').length}
                  </div>
                  <div className="text-sm text-gray-600">تحذيرات</div>
                </div>
              </div>

              {/* Errors list */}
              {importErrors.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    المشاكل المكتشفة
                  </h4>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {importErrors.map((error, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded ${
                          error.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        صف {error.row + 1}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-auto max-h-60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-right">#</th>
                      <th className="p-2 text-right">المعرف</th>
                      <th className="p-2 text-right">الاسم</th>
                      <th className="p-2 text-right">الجنس</th>
                      <th className="p-2 text-right">الجيل</th>
                      <th className="p-2 text-right">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 10).map((member, index) => {
                      const rowErrors = importErrors.filter(e => e.row === index);
                      return (
                        <tr
                          key={index}
                          className={rowErrors.length > 0 ?
                            rowErrors.some(e => e.severity === 'error') ? 'bg-red-50' : 'bg-yellow-50'
                            : ''
                          }
                        >
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">{formatMemberId(member.id)}</td>
                          <td className="p-2">{member.firstName}</td>
                          <td className="p-2">{member.gender?.toUpperCase() === 'MALE' ? 'ذكر' : 'أنثى'}</td>
                          <td className="p-2">{member.generation}</td>
                          <td className="p-2">{member.status === 'Living' ? 'حي' : 'متوفي'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {importData.length > 10 && (
                  <div className="p-2 text-center text-gray-500 bg-gray-50">
                    و {importData.length - 10} صفوف أخرى...
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {importErrors.filter(e => e.severity === 'error').length > 0 ? (
                  <span className="text-red-600">⚠️ يجب إصلاح الأخطاء الحمراء قبل الاستيراد</span>
                ) : (
                  <span className="text-green-600">✓ جاهز للاستيراد</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmImport}
                  disabled={importErrors.filter(e => e.severity === 'error').length > 0}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    importErrors.filter(e => e.severity === 'error').length > 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  تأكيد الاستيراد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
