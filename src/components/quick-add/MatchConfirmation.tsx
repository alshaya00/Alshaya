'use client';

import { MatchCandidate, getMatchExplanation } from '@/lib/matching';
import LineageGraphPreview from './LineageGraphPreview';
import {
  Check,
  AlertCircle,
  GitBranch,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  TreeDeciduous,
  Info,
} from 'lucide-react';
import { useState } from 'react';

interface MatchConfirmationProps {
  candidate: MatchCandidate;
  newPersonName: string;
  newPersonGender?: 'Male' | 'Female';
  onConfirm: () => void;
  onSelectDifferent: () => void;
  onManualSelect: () => void;
}

export default function MatchConfirmation({
  candidate,
  newPersonName,
  newPersonGender = 'Male',
  onConfirm,
  onSelectDifferent,
  onManualSelect,
}: MatchConfirmationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRelatives, setShowRelatives] = useState(true);

  const explanation = getMatchExplanation(candidate);

  const getConfidenceBadge = () => {
    if (candidate.matchScore >= 95) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        icon: <Check size={16} className="text-green-600" />,
        label: 'تطابق تام',
        labelEn: 'Exact Match',
      };
    }
    if (candidate.matchScore >= 80) {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-300',
        icon: <Star size={16} className="text-blue-600" />,
        label: 'تطابق عالي',
        labelEn: 'High Match',
      };
    }
    if (candidate.matchScore >= 60) {
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
        icon: <AlertCircle size={16} className="text-amber-600" />,
        label: 'تطابق متوسط',
        labelEn: 'Medium Match',
      };
    }
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      icon: <AlertCircle size={16} className="text-gray-600" />,
      label: 'تطابق منخفض',
      labelEn: 'Low Match',
    };
  };

  const badge = getConfidenceBadge();

  // Generate full lineage chain text
  const generateFullLineageText = () => {
    const connector = newPersonGender === 'Male' ? 'بن' : 'بنت';
    const parts = [newPersonName];

    for (const ancestor of candidate.fullLineage) {
      parts.push(connector);
      parts.push(ancestor.firstName);
    }

    parts.push('آل شايع');
    return parts.join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <div className={`${badge.bg} ${badge.border} border rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${badge.bg} flex items-center justify-center`}>
            {badge.icon}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${badge.text}`}>
              {badge.label}
            </h3>
            <p className="text-sm text-gray-600">
              نسبة التطابق: {candidate.matchScore}% - مستوى الثقة: {
                candidate.confidence === 'high' ? 'عالي' :
                candidate.confidence === 'medium' ? 'متوسط' : 'منخفض'
              }
            </p>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {candidate.matchScore}%
          </div>
        </div>
      </div>

      {/* Full Name Preview */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-center gap-2 mb-2">
          <TreeDeciduous size={18} className="text-indigo-600" />
          <span className="text-sm font-medium text-indigo-700">الاسم الكامل للجيل الأول</span>
        </div>
        <p className="text-lg font-bold text-gray-900 leading-relaxed" dir="rtl">
          {generateFullLineageText()}
        </p>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <GitBranch size={14} />
            <span>الجيل {candidate.generation}</span>
          </div>
          {candidate.branch && (
            <div className="flex items-center gap-1">
              <span>الفرع: {candidate.branch}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lineage Graph */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-500 to-indigo-600 px-4 py-3 text-white flex items-center justify-between">
          <h4 className="font-bold flex items-center gap-2">
            <span className="text-lg">🌳</span>
            شجرة النسب
          </h4>
          <span className="text-xs bg-white/20 px-2 py-1 rounded">
            {candidate.fullLineage.length} أجيال
          </span>
        </div>
        <div className="p-4 flex justify-center">
          <LineageGraphPreview
            candidate={candidate}
            newPersonName={newPersonName}
            newPersonGender={newPersonGender}
            width={450}
            height={380}
            showUncles={true}
            showSiblings={true}
          />
        </div>
      </div>

      {/* Relatives Section */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <button
          onClick={() => setShowRelatives(!showRelatives)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-600" />
            <span className="font-medium text-gray-800">الأقارب</span>
          </div>
          {showRelatives ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showRelatives && (
          <div className="p-4 space-y-4">
            {/* Father */}
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-2">الأب</h5>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600">👨</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{candidate.father.firstName}</p>
                  <p className="text-sm text-gray-500">
                    {candidate.father.fullNameAr || `${candidate.father.firstName} بن ${candidate.father.fatherName || ''} آل شايع`}
                  </p>
                </div>
              </div>
            </div>

            {/* Siblings */}
            {candidate.siblings.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">
                  الإخوة والأخوات ({candidate.siblings.length})
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {candidate.siblings.slice(0, 6).map((sibling) => (
                    <div
                      key={sibling.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                    >
                      <span className={sibling.gender === 'Male' ? 'text-blue-500' : 'text-pink-500'}>
                        {sibling.gender === 'Male' ? '👦' : '👧'}
                      </span>
                      <span className="text-sm text-gray-700">{sibling.firstName}</span>
                    </div>
                  ))}
                  {candidate.siblings.length > 6 && (
                    <div className="text-sm text-gray-500 p-2">
                      +{candidate.siblings.length - 6} آخرين
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Uncles & Aunts */}
            {candidate.unclesAunts.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">
                  الأعمام والعمات ({candidate.unclesAunts.length})
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {candidate.unclesAunts.slice(0, 6).map((relative) => (
                    <div
                      key={relative.id}
                      className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"
                    >
                      <span className={relative.gender === 'Male' ? 'text-green-600' : 'text-green-500'}>
                        {relative.gender === 'Male' ? '👨' : '👩'}
                      </span>
                      <span className="text-sm text-gray-700">{relative.firstName}</span>
                    </div>
                  ))}
                  {candidate.unclesAunts.length > 6 && (
                    <div className="text-sm text-gray-500 p-2">
                      +{candidate.unclesAunts.length - 6} آخرين
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cousins */}
            {candidate.cousins.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-2">
                  أبناء الأعمام ({candidate.cousins.length})
                </h5>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {candidate.cousins.slice(0, 5).map(c => c.firstName).join('، ')}
                  {candidate.cousins.length > 5 && ` و${candidate.cousins.length - 5} آخرين`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Match Details */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info size={18} className="text-gray-600" />
            <span className="font-medium text-gray-800">تفاصيل التطابق</span>
          </div>
          {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showDetails && (
          <div className="p-4 space-y-3">
            {explanation.detailsAr.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{detail}</span>
              </div>
            ))}

            {/* Ancestor match breakdown */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <h5 className="text-sm font-medium text-gray-600">نسب التطابق التفصيلية</h5>

              <div className="space-y-2">
                {/* Father */}
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">الأب ({candidate.ancestorMatches.father.inputName})</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${candidate.ancestorMatches.father.matchResult.similarity}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {candidate.ancestorMatches.father.matchResult.similarity}%
                    </span>
                  </div>
                </div>

                {/* Grandfather */}
                {candidate.ancestorMatches.grandfather && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">الجد ({candidate.ancestorMatches.grandfather.inputName})</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${candidate.ancestorMatches.grandfather.matchResult.similarity}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {candidate.ancestorMatches.grandfather.matchResult.similarity}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Great-grandfather */}
                {candidate.ancestorMatches.greatGrandfather && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">جد الأب ({candidate.ancestorMatches.greatGrandfather.inputName})</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${candidate.ancestorMatches.greatGrandfather.matchResult.similarity}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {candidate.ancestorMatches.greatGrandfather.matchResult.similarity}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onManualSelect}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          اختيار يدوي
        </button>
        <button
          onClick={onSelectDifferent}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          بحث آخر
        </button>
        <button
          onClick={onConfirm}
          className="flex-[2] px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 font-bold flex items-center justify-center gap-2"
        >
          <Check size={18} />
          تأكيد المكان
        </button>
      </div>
    </div>
  );
}
