'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Image,
  BookOpen,
  Folder,
  Award,
  ChevronRight,
  ArrowRight,
  Clock,
  CheckCircle,
  Camera,
  FileText,
  FolderPlus,
  Star,
} from 'lucide-react';

interface ContentStats {
  pendingImages: number;
  pendingStories: number;
  albumFolders: number;
  creditsCategories: number;
  totalImages: number;
  totalStories: number;
}

interface PendingItem {
  id: string;
  type: 'image' | 'story';
  title: string;
  memberName: string;
  createdAt: string;
}

export default function ContentHubPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<ContentStats>({
    pendingImages: 0,
    pendingStories: 0,
    albumFolders: 0,
    creditsCategories: 0,
    totalImages: 0,
    totalStories: 0,
  });
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.token) {
      loadData();
    }
  }, [session?.token]);

  const loadData = async () => {
    setIsLoading(true);
    const headers: HeadersInit = session?.token ? { Authorization: `Bearer ${session.token}` } : {};
    
    try {
      const [imagesRes, journalsRes, foldersRes, creditsRes] = await Promise.all([
        fetch('/api/images/pending', { headers }),
        fetch('/api/admin/journals', { headers }).catch(() => ({ json: () => ({ journals: [] }) })),
        fetch('/api/admin/folders', { headers }).catch(() => ({ json: () => ({ folders: [] }) })),
        fetch('/api/admin/credits-categories', { headers }).catch(() => ({ json: () => ({ categories: [] }) })),
      ]);

      const imagesData = await imagesRes.json().catch(() => ({ pending: [] }));
      const journalsData = await journalsRes.json().catch(() => ({ journals: [] }));
      const foldersData = await foldersRes.json().catch(() => ({ folders: [] }));
      const creditsData = await creditsRes.json().catch(() => ({ categories: [] }));

      const pendingImages = imagesData.pending?.filter((p: { reviewStatus: string }) => p.reviewStatus === 'PENDING').length || 0;
      const pendingStories = journalsData.journals?.filter((j: { status: string }) => j.status === 'PENDING').length || 0;

      setStats({
        pendingImages,
        pendingStories,
        albumFolders: foldersData.folders?.length || 0,
        creditsCategories: creditsData.categories?.length || 0,
        totalImages: imagesData.pending?.length || 0,
        totalStories: journalsData.journals?.length || 0,
      });

      const items: PendingItem[] = [];
      imagesData.pending?.slice(0, 3).forEach((img: { id: string; caption: string; memberName: string; createdAt: string }) => {
        items.push({
          id: img.id,
          type: 'image',
          title: img.caption || 'صورة جديدة',
          memberName: img.memberName || 'غير معروف',
          createdAt: img.createdAt,
        });
      });
      journalsData.journals?.filter((j: { status: string }) => j.status === 'PENDING').slice(0, 2).forEach((story: { id: string; title: string; authorName: string; createdAt: string }) => {
        items.push({
          id: story.id,
          type: 'story',
          title: story.title || 'قصة جديدة',
          memberName: story.authorName || 'غير معروف',
          createdAt: story.createdAt,
        });
      });
      setPendingItems(items.slice(0, 5));
    } catch (error) {
      console.error('Error loading content hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks = [
    { href: '/admin/images', label: 'الصور المعلقة', labelEn: 'Pending Images', icon: Camera, color: 'bg-purple-500', count: stats.pendingImages },
    { href: '/admin/journals', label: 'القصص والمذكرات', labelEn: 'Stories & Journals', icon: BookOpen, color: 'bg-blue-500', count: stats.pendingStories },
    { href: '/admin/album-folders', label: 'مجلدات الألبومات', labelEn: 'Album Folders', icon: FolderPlus, color: 'bg-green-500', count: stats.albumFolders },
    { href: '/admin/credits', label: 'فئات التقدير', labelEn: 'Credits Categories', icon: Award, color: 'bg-yellow-500', count: stats.creditsCategories },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-pink-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-pink-200 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Image className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">المحتوى والوسائط</h1>
              <p className="text-pink-200 mt-1">Content Hub - إدارة الصور والقصص والمحتوى</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">صور معلقة</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendingImages}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Camera className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">قصص معلقة</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendingStories}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">مجلدات الألبومات</p>
                <p className="text-3xl font-bold text-gray-800">{stats.albumFolders}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">فئات التقدير</p>
                <p className="text-3xl font-bold text-gray-800">{stats.creditsCategories}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">روابط سريعة</h2>
              <div className="grid grid-cols-2 gap-4">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group"
                    >
                      <div className={`w-14 h-14 ${link.color} rounded-xl flex items-center justify-center text-white relative`}>
                        <Icon className="w-7 h-7" />
                        {link.count !== undefined && link.count > 0 && (
                          <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                            {link.count}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 group-hover:text-purple-600">{link.label}</p>
                        <p className="text-sm text-gray-500">{link.labelEn}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 mr-auto group-hover:text-purple-500" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">محتوى معلق</h2>
              <Link href="/admin/images" className="text-sm text-purple-600 hover:underline">
                عرض الكل
              </Link>
            </div>
            <div className="space-y-3">
              {pendingItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>لا يوجد محتوى معلق</p>
                </div>
              ) : (
                pendingItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.type === 'image' ? '/admin/images' : '/admin/journals'}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 ${item.type === 'image' ? 'bg-purple-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                      {item.type === 'image' ? (
                        <Camera className="w-5 h-5 text-purple-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.memberName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'image' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {item.type === 'image' ? 'صورة' : 'قصة'}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
