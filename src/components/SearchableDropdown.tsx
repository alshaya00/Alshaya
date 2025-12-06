'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, User } from 'lucide-react';
import { FamilyMember } from '@/lib/data';

interface SearchableDropdownProps {
  options: FamilyMember[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'ابحث واختر...',
  allowEmpty = true,
  emptyLabel = '-- الجذر (بدون أب) --',
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected member
  const selectedMember = options.find((m) => m.id === value);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const query = searchQuery.toLowerCase();
    return options.filter((member) => {
      const searchFields = [
        member.id,
        member.firstName,
        member.fullNameAr,
        member.fullNameEn,
        member.branch,
        member.city,
        `الجيل ${member.generation}`,
        `Gen ${member.generation}`,
      ].filter(Boolean);

      return searchFields.some((field) =>
        field?.toLowerCase().includes(query)
      );
    });
  }, [options, searchQuery]);

  // Group options by generation
  const groupedOptions = useMemo(() => {
    const groups: Record<number, FamilyMember[]> = {};
    filteredOptions.forEach((member) => {
      if (!groups[member.generation]) {
        groups[member.generation] = [];
      }
      groups[member.generation].push(member);
    });
    return groups;
  }, [filteredOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (memberId: string) => {
    onChange(memberId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const generationColors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-green-100 text-green-800',
    5: 'bg-teal-100 text-teal-800',
    6: 'bg-blue-100 text-blue-800',
    7: 'bg-indigo-100 text-indigo-800',
    8: 'bg-purple-100 text-purple-800',
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Value / Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl transition-all duration-200 text-right ${
          isOpen
            ? 'border-green-500 ring-2 ring-green-200 bg-white'
            : 'border-gray-200 bg-green-50 hover:border-green-300'
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            selectedMember ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            <User size={20} />
          </div>
          {selectedMember ? (
            <div className="text-right flex-1">
              <p className="font-semibold text-gray-800">{selectedMember.fullNameAr || selectedMember.firstName}</p>
              <p className="text-sm text-gray-500">
                {selectedMember.id} • الجيل {selectedMember.generation} • {selectedMember.branch}
              </p>
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedMember && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو رقم التعريف أو الجيل..."
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200 text-right"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-80 overflow-y-auto">
            {/* Empty Option (Root) */}
            {allowEmpty && !searchQuery && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-4 py-3 text-right hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 ${
                  value === '' ? 'bg-green-50' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-lg">🌳</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">{emptyLabel}</p>
                  <p className="text-sm text-gray-400">إضافة كجذر جديد</p>
                </div>
              </button>
            )}

            {/* Grouped Options by Generation */}
            {Object.entries(groupedOptions)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([generation, members]) => (
                <div key={generation}>
                  {/* Generation Header */}
                  <div className={`px-4 py-2 sticky top-0 ${generationColors[Number(generation)] || 'bg-gray-100'}`}>
                    <span className="font-semibold text-sm">
                      الجيل {generation} ({members.length} عضو)
                    </span>
                  </div>

                  {/* Members in this generation */}
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleSelect(member.id)}
                      className={`w-full px-4 py-3 text-right hover:bg-green-50 transition-colors flex items-center gap-3 border-b border-gray-50 ${
                        value === member.id ? 'bg-green-100' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        member.gender === 'Male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                      }`}>
                        <User size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {member.fullNameAr || member.firstName}
                          {searchQuery && (
                            <span className="mr-2 text-xs text-green-600">✓</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.id} • {member.branch || 'غير محدد'}
                          {member.birthYear && ` • ${member.birthYear}`}
                        </p>
                      </div>
                      {member.sonsCount > 0 && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {member.sonsCount} أبناء
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}

            {/* No Results */}
            {filteredOptions.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p>لا توجد نتائج لـ &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400">
              {filteredOptions.length} عضو متاح
              {searchQuery && ` من أصل ${options.length}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
