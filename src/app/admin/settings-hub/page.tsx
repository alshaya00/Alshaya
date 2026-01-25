'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings,
  Sliders,
  ToggleLeft,
  Server,
  Bell,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Cog,
  Shield,
  Zap,
  Megaphone,
  Globe,
  Lock,
} from 'lucide-react';

interface SettingsStatus {
  configItems: number;
  featuresEnabled: number;
  servicesActive: number;
  broadcastsPending: number;
}

export default function SettingsHubPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<SettingsStatus>({
    configItems: 0,
    featuresEnabled: 0,
    servicesActive: 0,
    broadcastsPending: 0,
  });
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
      const [configRes, featuresRes, servicesRes, broadcastsRes] = await Promise.all([
        fetch('/api/admin/config', { headers }),
        fetch('/api/admin/features', { headers }),
        fetch('/api/admin/services', { headers }),
        fetch('/api/broadcasts', { headers }).catch(() => ({ json: () => ({ broadcasts: [] }) })),
      ]);

      const configData = await configRes.json().catch(() => ({ config: {} }));
      const featuresData = await featuresRes.json().catch(() => ({ features: [] }));
      const servicesData = await servicesRes.json().catch(() => ({ services: [] }));
      const broadcastsData = await broadcastsRes.json().catch(() => ({ broadcasts: [] }));

      const featuresEnabled = featuresData.features?.filter((f: { enabled: boolean }) => f.enabled).length || 0;
      const servicesActive = servicesData.services?.filter((s: { status: string }) => s.status === 'active').length || 0;
      const broadcastsPending = broadcastsData.broadcasts?.filter((b: { status: string }) => b.status === 'DRAFT' || b.status === 'SCHEDULED').length || 0;

      setStatus({
        configItems: Object.keys(configData.config || {}).length || 10,
        featuresEnabled,
        servicesActive,
        broadcastsPending,
      });
    } catch (error) {
      console.error('Error loading settings hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks = [
    { 
      href: '/admin/config', 
      label: 'إعدادات النظام', 
      labelEn: 'System Configuration', 
      icon: Cog, 
      color: 'bg-blue-500',
      description: 'تخصيص الإعدادات العامة للنظام'
    },
    { 
      href: '/admin/features', 
      label: 'الميزات', 
      labelEn: 'Features', 
      icon: Zap, 
      color: 'bg-yellow-500',
      description: 'تفعيل وإدارة ميزات التطبيق',
      count: status.featuresEnabled
    },
    { 
      href: '/admin/services', 
      label: 'الخدمات', 
      labelEn: 'Services', 
      icon: Server, 
      color: 'bg-green-500',
      description: 'إدارة الخدمات المتصلة والـ APIs',
      count: status.servicesActive
    },
    { 
      href: '/admin/broadcasts', 
      label: 'الإشعارات الجماعية', 
      labelEn: 'Broadcasts', 
      icon: Megaphone, 
      color: 'bg-purple-500',
      description: 'إرسال إشعارات لأفراد العائلة',
      count: status.broadcastsPending
    },
  ];

  const additionalSettings = [
    { href: '/admin/settings', label: 'إدارة المشرفين', labelEn: 'Admin Management', icon: Shield, color: 'text-red-500' },
    { href: '/admin/permissions', label: 'الصلاحيات', labelEn: 'Permissions', icon: Lock, color: 'text-purple-500' },
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
      <div className="bg-gradient-to-l from-gray-700 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition-colors">
            <ArrowRight className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">الإعدادات</h1>
              <p className="text-gray-300 mt-1">Settings Hub - إعدادات وتكوين النظام</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إعدادات النظام</p>
                <p className="text-3xl font-bold text-gray-800">{status.configItems}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sliders className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ميزات مفعلة</p>
                <p className="text-3xl font-bold text-gray-800">{status.featuresEnabled}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">خدمات نشطة</p>
                <p className="text-3xl font-bold text-gray-800">{status.servicesActive}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-r-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إشعارات معلقة</p>
                <p className="text-3xl font-bold text-gray-800">{status.broadcastsPending}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6">الإعدادات الرئيسية</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group"
                >
                  <div className={`w-14 h-14 ${link.color} rounded-xl flex items-center justify-center text-white relative`}>
                    <Icon className="w-7 h-7" />
                    {link.count !== undefined && link.count > 0 && (
                      <span className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                        {link.count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 group-hover:text-blue-600">{link.label}</p>
                    <p className="text-sm text-gray-500">{link.labelEn}</p>
                    <p className="text-xs text-gray-400 mt-1">{link.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">إعدادات إضافية</h2>
          <div className="space-y-3">
            {additionalSettings.map((setting) => {
              const Icon = setting.icon;
              return (
                <Link
                  key={setting.href}
                  href={setting.href}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${setting.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{setting.label}</p>
                    <p className="text-sm text-gray-500">{setting.labelEn}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
