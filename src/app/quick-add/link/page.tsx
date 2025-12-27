'use client';

import { useState, useEffect, useMemo } from 'react';
import { FamilyMember } from '@/lib/types';
import { paginationSettings } from '@/config/constants';
import {
  Link as LinkIcon,
  Copy,
  Check,
  Search,
  QrCode,
  Share2,
  Users,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import GenderAvatar from '@/components/GenderAvatar';

export default function QuickAddLinkGenerator() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedFatherId, setSelectedFatherId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load members (public endpoint, no auth needed)
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch(`/api/members?limit=${paginationSettings.defaultFetchLimit}`);
        const data = await res.json();
        setMembers(data.data || []);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadMembers();
  }, []);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(m =>
      m.firstName?.toLowerCase().includes(query) ||
      m.fullNameAr?.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Group by generation
  const membersByGeneration = useMemo(() => {
    const grouped: Record<number, FamilyMember[]> = {};
    filteredMembers.forEach(m => {
      if (!grouped[m.generation]) grouped[m.generation] = [];
      grouped[m.generation].push(m);
    });
    return grouped;
  }, [filteredMembers]);

  // Generate link
  const generatedLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    if (!selectedFatherId) return `${baseUrl}/quick-add`;
    const father = members.find(m => m.id === selectedFatherId);
    const params = new URLSearchParams();
    params.set('father', selectedFatherId);
    if (father?.branch) params.set('branch', father.branch);
    return `${baseUrl}/quick-add?${params.toString()}`;
  }, [selectedFatherId, members]);

  // Selected father info
  const selectedFather = members.find(m => m.id === selectedFatherId);

  // Copy to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share (mobile)
  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'إضافة عضو جديد - آل شايع',
          text: selectedFather
            ? `أضف نفسك كابن/ابنة ${selectedFather.firstName} في شجرة آل شايع`
            : 'أضف نفسك في شجرة عائلة آل شايع',
          url: generatedLink,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      copyLink();
    }
  };

  // Generate QR Code URL (using QR code API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedLink)}`;

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-emerald-50 to-white">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-4 shadow-lg">
            <LinkIcon className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">مولد رابط الإضافة السريعة</h1>
          <p className="text-gray-600 mt-2">أنشئ رابطاً لمشاركته مع أفراد العائلة</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step 1: Select Father */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-emerald-600" />
              اختر الأب (اختياري)
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              اختر الأب مسبقاً ليتم تعبئته تلقائياً للمستخدم، أو اتركه فارغاً للرابط العام
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو الرقم..."
                className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                dir="rtl"
              />
            </div>

            {/* Members List */}
            <div className="max-h-64 overflow-y-auto border rounded-xl">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
              ) : (
                <>
                  {/* No selection option */}
                  <button
                    onClick={() => setSelectedFatherId('')}
                    className={`w-full p-3 text-right border-b transition-colors ${
                      !selectedFatherId ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">رابط عام (بدون أب محدد)</span>
                      {!selectedFatherId && <Check size={16} className="text-emerald-600" />}
                    </div>
                  </button>

                  {/* Members by generation */}
                  {Object.keys(membersByGeneration)
                    .sort((a, b) => Number(a) - Number(b))
                    .map(gen => (
                      <div key={gen}>
                        <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 sticky top-0">
                          الجيل {gen}
                        </div>
                        {membersByGeneration[Number(gen)].map(member => (
                          <button
                            key={member.id}
                            onClick={() => setSelectedFatherId(member.id)}
                            className={`w-full p-3 text-right border-b transition-colors ${
                              selectedFatherId === member.id
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{member.firstName}</span>
                                {member.fatherName && (
                                  <span className="text-gray-500 text-sm mr-1">
                                    بن {member.fatherName}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400 mr-2">({member.id})</span>
                              </div>
                              {selectedFatherId === member.id && (
                                <Check size={16} className="text-emerald-600" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                </>
              )}
            </div>
          </div>

          {/* Selected Father Preview */}
          {selectedFather && (
            <div className="p-4 bg-emerald-50 border-b">
              <div className="flex items-center gap-3">
                <GenderAvatar gender={selectedFather.gender} size="lg" />
                <div>
                  <p className="font-bold text-emerald-800">{selectedFather.firstName}</p>
                  <p className="text-sm text-emerald-600">
                    {selectedFather.fullNameAr || `${selectedFather.firstName} آل شايع`}
                  </p>
                  <p className="text-xs text-emerald-500">
                    الجيل {selectedFather.generation} • {selectedFather.branch || 'الأصل'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generated Link */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <LinkIcon size={20} className="text-emerald-600" />
              الرابط المُنشأ
            </h2>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 font-mono outline-none"
                  dir="ltr"
                />
                <button
                  onClick={copyLink}
                  className={`p-2 rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-white border hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              {copied && (
                <p className="text-green-600 text-sm mt-2 text-center">تم النسخ!</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <Copy size={18} />
                نسخ الرابط
              </button>
              <button
                onClick={shareLink}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                <Share2 size={18} />
                مشاركة
              </button>
            </div>

            {/* QR Code Toggle */}
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <QrCode size={18} />
              {showQR ? 'إخفاء رمز QR' : 'عرض رمز QR'}
              <ChevronDown size={18} className={`transition-transform ${showQR ? 'rotate-180' : ''}`} />
            </button>

            {/* QR Code */}
            {showQR && (
              <div className="mt-4 flex flex-col items-center p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48 mb-3"
                />
                <p className="text-sm text-gray-500 text-center">
                  امسح هذا الرمز بالكاميرا للوصول للرابط
                </p>
              </div>
            )}

            {/* Open Link */}
            <a
              href={generatedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 rounded-xl font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <ExternalLink size={18} />
              فتح الرابط للتجربة
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-amber-50 rounded-xl p-6 border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-3">📋 طريقة الاستخدام</h3>
          <ol className="space-y-2 text-sm text-amber-700 list-decimal list-inside">
            <li>اختر الأب من القائمة (اختياري)</li>
            <li>انسخ الرابط أو شاركه مباشرة</li>
            <li>أرسل الرابط لأفراد العائلة عبر واتساب أو غيره</li>
            <li>عند فتح الرابط، سيُطلب منهم إدخال أسمائهم فقط</li>
            <li>جميع الإضافات تخضع لمراجعة المسؤول قبل النشر</li>
          </ol>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/quick-add"
            className="text-emerald-600 hover:text-emerald-800 font-medium"
          >
            ← العودة للإضافة السريعة
          </a>
        </div>
      </div>
    </div>
  );
}
