'use client';

import { MatchCandidate, compareCandidates } from '@/lib/matching';
import LineageGraphPreview from './LineageGraphPreview';
import { Check, AlertCircle, Star, Users, GitBranch } from 'lucide-react';

interface MatchComparisonGraphsProps {
  candidates: MatchCandidate[];
  newPersonName: string;
  newPersonGender?: 'Male' | 'Female';
  selectedId?: string;
  onSelect: (candidate: MatchCandidate) => void;
  maxDisplay?: number;
}

export default function MatchComparisonGraphs({
  candidates,
  newPersonName,
  newPersonGender = 'Male',
  selectedId,
  onSelect,
  maxDisplay = 4,
}: MatchComparisonGraphsProps) {
  const displayCandidates = candidates.slice(0, maxDisplay);

  // Get comparison if we have exactly 2 candidates
  const comparison = displayCandidates.length === 2
    ? compareCandidates(displayCandidates[0], displayCandidates[1])
    : null;

  const getConfidenceBadge = (score: number, confidence: string) => {
    if (score >= 95) return { bg: 'bg-green-100', text: 'text-green-800', label: 'تطابق تام', labelEn: 'Exact Match' };
    if (score >= 80) return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'تطابق عالي', labelEn: 'High Match' };
    if (score >= 60) return { bg: 'bg-amber-100', text: 'text-amber-800', label: 'تطابق متوسط', labelEn: 'Medium Match' };
    return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'تطابق منخفض', labelEn: 'Low Match' };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">
          اختر المكان الصحيح
          <span className="text-sm font-normal text-gray-500 mr-2">
            ({displayCandidates.length} تطابقات)
          </span>
        </h3>
        {comparison?.recommendation && (
          <div className="flex items-center gap-1 text-sm text-amber-600">
            <Star size={14} className="fill-amber-500" />
            <span>
              المقترح: الخيار {comparison.recommendation}
            </span>
          </div>
        )}
      </div>

      {/* Comparison Grid */}
      <div className={`grid gap-4 ${
        displayCandidates.length === 1 ? 'grid-cols-1' :
        displayCandidates.length === 2 ? 'grid-cols-2' :
        displayCandidates.length === 3 ? 'grid-cols-3' :
        'grid-cols-2 lg:grid-cols-4'
      }`}>
        {displayCandidates.map((candidate, index) => {
          const isSelected = selectedId === candidate.fatherId;
          const badge = getConfidenceBadge(candidate.matchScore, candidate.confidence);
          const isRecommended = comparison?.recommendation === (index + 1);

          return (
            <div
              key={candidate.fatherId}
              onClick={() => onSelect(candidate)}
              className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-lg'
                  : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow">
                  <Check size={14} className="text-white" />
                </div>
              )}

              {/* Recommendation badge */}
              {isRecommended && !isSelected && (
                <div className="absolute -top-2 -left-2 z-10">
                  <div className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                    <Star size={10} className="fill-white" />
                    مقترح
                  </div>
                </div>
              )}

              {/* Card Header */}
              <div className="p-3 border-b bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    الخيار {index + 1}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                    {candidate.matchScore}%
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm">
                  {candidate.fullNamePreview}
                </h4>
              </div>

              {/* Graph */}
              <div className="p-2">
                <LineageGraphPreview
                  candidate={candidate}
                  newPersonName={newPersonName}
                  newPersonGender={newPersonGender}
                  width={displayCandidates.length <= 2 ? 350 : 250}
                  height={displayCandidates.length <= 2 ? 300 : 250}
                  compact={displayCandidates.length > 2}
                  showUncles={displayCandidates.length <= 2}
                  showSiblings={true}
                />
              </div>

              {/* Details */}
              <div className="p-3 border-t bg-gray-50 rounded-b-xl space-y-2">
                {/* Father info */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">الأب:</span>
                  <span className="font-medium text-gray-800">
                    {candidate.father.firstName}
                    {candidate.father.fatherName && ` بن ${candidate.father.fatherName}`}
                  </span>
                </div>

                {/* Generation & Branch */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <GitBranch size={12} className="text-gray-400" />
                    <span className="text-gray-500">الجيل:</span>
                    <span className="font-medium">{candidate.generation}</span>
                  </div>
                  {candidate.branch && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">الفرع:</span>
                      <span className="font-medium">{candidate.branch}</span>
                    </div>
                  )}
                </div>

                {/* Relatives count */}
                <div className="flex items-center gap-3 text-xs">
                  {candidate.siblings.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-blue-400" />
                      <span>{candidate.siblings.length} إخوة</span>
                    </div>
                  )}
                  {candidate.unclesAunts.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-green-400" />
                      <span>{candidate.unclesAunts.length} أعمام</span>
                    </div>
                  )}
                </div>

                {/* Match details */}
                <div className="pt-2 border-t border-gray-200 text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    {candidate.ancestorMatches.father.matchResult.isMatch ? (
                      <Check size={12} className="text-green-500" />
                    ) : (
                      <AlertCircle size={12} className="text-amber-500" />
                    )}
                    <span className="text-gray-600">
                      الأب: {candidate.ancestorMatches.father.matchResult.similarity}%
                    </span>
                  </div>
                  {candidate.ancestorMatches.grandfather && (
                    <div className="flex items-center gap-1 mb-1">
                      {candidate.ancestorMatches.grandfather.matchResult.isMatch ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-amber-500" />
                      )}
                      <span className="text-gray-600">
                        الجد: {candidate.ancestorMatches.grandfather.matchResult.similarity}%
                      </span>
                    </div>
                  )}
                  {candidate.ancestorMatches.greatGrandfather && (
                    <div className="flex items-center gap-1">
                      {candidate.ancestorMatches.greatGrandfather.matchResult.isMatch ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-amber-500" />
                      )}
                      <span className="text-gray-600">
                        جد الأب: {candidate.ancestorMatches.greatGrandfather.matchResult.similarity}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-indigo-500/5 rounded-xl pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison differences (for 2 candidates) */}
      {comparison && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            الفروقات بين الخيارين
          </h4>
          <ul className="space-y-1 text-sm text-amber-700">
            {comparison.differencesAr.map((diff, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                {diff}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No match warning */}
      {candidates.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <AlertCircle size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">لم يتم العثور على تطابقات</p>
          <p className="text-gray-500 text-sm mt-1">
            الرجاء التنقل في شجرة العائلة يدوياً لاختيار الأب
          </p>
        </div>
      )}
    </div>
  );
}
