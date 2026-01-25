'use client';

import { useState } from 'react';
import { GitBranch, Users, ChevronLeft, SkipForward, HelpCircle, Check } from 'lucide-react';
import { MatchCandidate } from '@/lib/matching';
import { normalizeArabicName } from '@/lib/matching/arabic-utils';

export type HelperStep = null | 'branch' | 'uncle' | 'done';

interface Branch {
  id: string;
  nameAr: string;
  nameEn: string;
}

const BRANCHES: Branch[] = [
  { id: 'ibrahim', nameAr: 'فرع إبراهيم', nameEn: 'Ibrahim branch' },
  { id: 'abdulkarim', nameAr: 'فرع عبدالكريم', nameEn: 'Abdulkarim branch' },
  { id: 'fawzan', nameAr: 'فرع فوزان', nameEn: 'Fawzan branch' },
];

interface SearchHelperQuestionsProps {
  helperStep: HelperStep;
  matchResults: MatchCandidate[];
  selectedBranch: string | null;
  uncleNameFilter: string;
  onBranchSelect: (branch: string | null) => void;
  onUncleNameChange: (name: string) => void;
  onNextStep: () => void;
  onSkip: () => void;
  filteredCount: number;
}

export function filterByBranch(candidates: MatchCandidate[], branchId: string | null): MatchCandidate[] {
  if (!branchId) return candidates;
  
  const branchNameMap: Record<string, string[]> = {
    'ibrahim': ['إبراهيم', 'ابراهيم', 'Ibrahim'],
    'abdulkarim': ['عبدالكريم', 'عبد الكريم', 'Abdulkarim', 'Abdul Karim'],
    'fawzan': ['فوزان', 'Fawzan'],
  };
  
  const branchNames = branchNameMap[branchId] || [];
  
  return candidates.filter(candidate => {
    const branchName = candidate.branch || candidate.father.lineageBranchName || '';
    return branchNames.some(name => 
      branchName.toLowerCase().includes(name.toLowerCase()) ||
      normalizeArabicName(branchName).includes(normalizeArabicName(name))
    );
  });
}

export function filterByUncleName(candidates: MatchCandidate[], uncleName: string): MatchCandidate[] {
  if (!uncleName.trim()) return candidates;
  
  const normalizedInput = normalizeArabicName(uncleName.trim());
  
  return candidates.filter(candidate => {
    return candidate.unclesAunts.some(uncle => {
      const normalizedUncle = normalizeArabicName(uncle.firstName);
      return normalizedUncle.includes(normalizedInput) || 
             normalizedInput.includes(normalizedUncle) ||
             uncle.firstName.includes(uncleName) ||
             uncleName.includes(uncle.firstName);
    });
  });
}

export default function SearchHelperQuestions({
  helperStep,
  matchResults,
  selectedBranch,
  uncleNameFilter,
  onBranchSelect,
  onUncleNameChange,
  onNextStep,
  onSkip,
  filteredCount,
}: SearchHelperQuestionsProps) {
  const [localUncleName, setLocalUncleName] = useState(uncleNameFilter);

  const handleUncleSubmit = () => {
    onUncleNameChange(localUncleName);
    onNextStep();
  };

  if (helperStep === 'branch') {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <GitBranch size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">أي فرع أنت؟</h3>
            <p className="text-sm text-gray-500">
              هذا يساعدنا على تحديد مكانك في الشجرة بشكل أسرع
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {BRANCHES.map((branch) => (
            <button
              key={branch.id}
              onClick={() => {
                onBranchSelect(branch.id);
                onNextStep();
              }}
              className={`p-4 rounded-xl border-2 transition-all text-center hover:shadow-md ${
                selectedBranch === branch.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-indigo-300 bg-white'
              }`}
            >
              <GitBranch size={20} className="mx-auto mb-2 text-indigo-500" />
              <span className="font-bold block">{branch.nameAr}</span>
              <span className="text-xs text-gray-400">{branch.nameEn}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            onBranchSelect(null);
            onNextStep();
          }}
          className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
        >
          <HelpCircle size={18} />
          <span>لا أعرف</span>
        </button>

        <div className="mt-4 text-center text-sm text-gray-400">
          {matchResults.length} نتيجة محتملة
        </div>
      </div>
    );
  }

  if (helperStep === 'uncle') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border border-green-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Users size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">ما اسم أحد أعمامك؟</h3>
            <p className="text-sm text-gray-500">
              أي عم من أعمامك (إخوة والدك) يساعدنا في التأكد
            </p>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={localUncleName}
            onChange={(e) => setLocalUncleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUncleSubmit();
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 transition-all"
            placeholder="مثال: سعد، عبدالله، محمد..."
            dir="rtl"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleUncleSubmit}
            disabled={!localUncleName.trim()}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check size={18} />
            تأكيد
          </button>
          <button
            onClick={() => {
              onUncleNameChange('');
              onNextStep();
            }}
            className="py-3 px-6 border-2 border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <SkipForward size={18} />
            تخطي
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-400">
          {filteredCount} نتيجة {selectedBranch ? 'بعد تصفية الفرع' : 'محتملة'}
        </div>
      </div>
    );
  }

  return null;
}
