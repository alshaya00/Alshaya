'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserX, UserCheck, Search, Filter, Mail, Phone, Send,
  Loader2, ChevronDown, Link2, Copy, Check, X, ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import GenderAvatar from '@/components/GenderAvatar';
import { formatPhoneDisplay } from '@/lib/phone-utils';

interface UnlinkedMember {
  id: string;
  firstName: string;
  fatherName: string | null;
  grandfatherName: string | null;
  fullNameAr: string | null;
  fullNameEn: string | null;
  gender: string;
  generation: number;
  branch: string | null;
  lineageBranchName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  city: string | null;
  photoUrl: string | null;
  isLinked: boolean;
}

interface Stats {
  total: number;
  linked: number;
  unlinked: number;
  withPhone: number;
  withEmail: number;
  withContact: number;
}

interface InviteModalData {
  member: UnlinkedMember;
  invitation?: {
    code: string;
    link: string;
    expiresAt: string;
  };
}

export default function AdminUnlinkedPage() {
  const [members, setMembers] = useState<UnlinkedMember[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, linked: 0, unlinked: 0, withPhone: 0, withEmail: 0, withContact: 0 });
  const [branches, setBranches] = useState<string[]>([]);
  const [generations, setGenerations] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterGeneration, setFilterGeneration] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState<'unlinked' | 'linked' | 'all'>('unlinked');
  const [showFilters, setShowFilters] = useState(false);
  
  const [inviteModal, setInviteModal] = useState<InviteModalData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const { session } = useAuth();

  const fetchMembers = useCallback(async () => {
    if (!session?.token) return;
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterBranch) params.append('branch', filterBranch);
      if (filterGeneration) params.append('generation', filterGeneration);
      if (filterStatus) params.append('status', filterStatus);
      params.append('filter', filterType);
      
      const res = await fetch(`/api/admin/unlinked?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setStats(data.stats || { total: 0, linked: 0, unlinked: 0, withPhone: 0, withEmail: 0, withContact: 0 });
        setBranches(data.filters?.branches || []);
        setGenerations(data.filters?.generations || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.token, searchQuery, filterBranch, filterGeneration, filterStatus, filterType]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchMembers]);

  const handleSendInvite = async (member: UnlinkedMember, sendVia: 'phone' | 'email') => {
    if (!session?.token) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/unlinked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ memberId: member.id, sendVia }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setInviteModal({
          member,
          invitation: data.invitation,
        });
      } else {
        alert(data.messageAr || data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('حدث خطأ أثناء إنشاء الدعوة');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const filteredMembers = useMemo(() => {
    return members;
  }, [members]);

  if (isLoading && members.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <UserX className="text-orange-500" size={28} />
              الأعضاء غير المرتبطين
            </h1>
            <p className="text-gray-500 mt-1">أعضاء العائلة الذين ليس لديهم حساب مستخدم مرتبط</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilterType('unlinked')}
            className={`p-4 rounded-xl text-center transition-all ${
              filterType === 'unlinked' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border hover:border-orange-300'
            }`}
          >
            <UserX size={24} className={`mx-auto mb-2 ${filterType === 'unlinked' ? 'text-white' : 'text-orange-500'}`} />
            <p className="text-2xl font-bold">{stats.unlinked}</p>
            <p className="text-sm opacity-80">غير مرتبط</p>
          </button>
          <button
            onClick={() => setFilterType('linked')}
            className={`p-4 rounded-xl text-center transition-all ${
              filterType === 'linked' ? 'bg-green-500 text-white shadow-lg' : 'bg-white border hover:border-green-300'
            }`}
          >
            <UserCheck size={24} className={`mx-auto mb-2 ${filterType === 'linked' ? 'text-white' : 'text-green-500'}`} />
            <p className="text-2xl font-bold">{stats.linked}</p>
            <p className="text-sm opacity-80">مرتبط</p>
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`p-4 rounded-xl text-center transition-all ${
              filterType === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white border hover:border-blue-300'
            }`}
          >
            <Users size={24} className={`mx-auto mb-2 ${filterType === 'all' ? 'text-white' : 'text-blue-500'}`} />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm opacity-80">الكل</p>
          </button>
          <div className="p-4 rounded-xl bg-white border text-center">
            <Phone size={24} className="mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-gray-800">{stats.withContact}</p>
            <p className="text-sm text-gray-500">لديهم وسيلة تواصل</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الهاتف أو البريد..."
                className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFilters ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={18} />
              الفلاتر
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
{/* Branch filter hidden - not in use
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="">كل الفروع</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
*/}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجيل</label>
                <select
                  value={filterGeneration}
                  onChange={(e) => setFilterGeneration(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="">كل الأجيال</option>
                  {generations.map(gen => (
                    <option key={gen} value={gen}>الجيل {gen}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="">الكل</option>
                  <option value="Living">على قيد الحياة</option>
                  <option value="Deceased">متوفى</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-700">لا يوجد أعضاء</h3>
            <p className="text-gray-500 mt-1">لا يوجد أعضاء يطابقون معايير البحث</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm text-gray-600">
                عرض {filteredMembers.length} عضو
                {isLoading && <Loader2 className="inline-block mr-2 animate-spin" size={14} />}
              </p>
            </div>
            <div className="divide-y">
              {filteredMembers.map(member => (
                <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <GenderAvatar gender={member.gender as 'Male' | 'Female'} size="lg" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">
                          {member.fullNameAr || member.firstName}
                        </h3>
                        {member.isLinked ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                            <Link2 size={12} />
                            مرتبط
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            غير مرتبط
                          </span>
                        )}
                        {member.status === 'Deceased' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            متوفى
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>الجيل: {member.generation}</span>
                        {member.lineageBranchName && (
                          <span>الفرع: {member.lineageBranchName}</span>
                        )}
                        <span className="text-xs text-gray-400">#{member.id.slice(0, 8)}</span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-3">
                        {member.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone size={14} className="text-gray-400" />
                            <span dir="ltr">{formatPhoneDisplay(member.phone)}</span>
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail size={14} className="text-gray-400" />
                            <span>{member.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!member.isLinked && (member.phone || member.email) && (
                      <div className="flex items-center gap-2">
                        {member.phone && (
                          <button
                            onClick={() => handleSendInvite(member, 'phone')}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Send size={14} />
                            دعوة جوال
                          </button>
                        )}
                        {member.email && (
                          <button
                            onClick={() => handleSendInvite(member, 'email')}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Mail size={14} />
                            دعوة بريد
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {inviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">تم إنشاء الدعوة</h3>
              <button
                onClick={() => setInviteModal(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Check size={20} className="text-green-600" />
                <span className="font-medium text-green-800">تم إنشاء رمز الدعوة بنجاح</span>
              </div>
              <p className="text-sm text-green-700">
                للعضو: {inviteModal.member.fullNameAr || inviteModal.member.firstName}
              </p>
            </div>

            {inviteModal.invitation && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">رمز الدعوة</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-gray-100 rounded-lg font-mono text-lg text-center">
                      {inviteModal.invitation.code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(inviteModal.invitation!.code)}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copiedCode ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-gray-600" />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">رابط التسجيل</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteModal.invitation.link}
                      readOnly
                      className="flex-1 p-2 bg-gray-100 rounded-lg text-sm text-gray-600"
                      dir="ltr"
                    />
                    <button
                      onClick={() => copyToClipboard(inviteModal.invitation!.link)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Copy size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-500 mb-4">
                  <p>ينتهي في: {new Date(inviteModal.invitation.expiresAt).toLocaleDateString('ar-SA')}</p>
                </div>

                <div className="flex gap-2">
                  {inviteModal.member.phone && (
                    <a
                      href={`https://wa.me/${inviteModal.member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً! يمكنك الانضمام لشجرة العائلة عبر هذا الرابط:\n${inviteModal.invitation.link}\n\nأو استخدم رمز الدعوة: ${inviteModal.invitation.code}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink size={16} />
                      إرسال عبر واتساب
                    </a>
                  )}
                  <button
                    onClick={() => setInviteModal(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
