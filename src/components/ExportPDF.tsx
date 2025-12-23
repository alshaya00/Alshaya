'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Loader2, CheckCircle, Share2 } from 'lucide-react';
import type { FamilyMember } from '@/lib/types';

interface Statistics {
  totalMembers: number;
  males: number;
  females: number;
  generations: number;
}

interface ExportPDFProps {
  className?: string;
}

export default function ExportPDF({ className = '' }: ExportPDFProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [stats, setStats] = useState<Statistics>({ totalMembers: 0, males: 0, females: 0, generations: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const statsRes = await fetch('/api/statistics');
        if (!statsRes.ok) {
          throw new Error(`Failed to load statistics: ${statsRes.status}`);
        }
        const statsData = await statsRes.json();
        setStats(statsData);

        const membersRes = await fetch('/api/members?limit=1000');
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.data || []);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل في تحميل البيانات';
        setError(message);
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const generatePDFContent = (): string => {
    const generations: Record<number, FamilyMember[]> = {};
    members.forEach((member) => {
      if (!generations[member.generation]) {
        generations[member.generation] = [];
      }
      generations[member.generation].push(member);
    });

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>شجرة آل شايع - Family Tree</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Tajawal', sans-serif;
            background: white;
            color: #1f2937;
            padding: 40px;
            line-height: 1.6;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #16a34a;
          }

          .logo {
            font-size: 48px;
            margin-bottom: 10px;
          }

          h1 {
            font-size: 32px;
            color: #16a34a;
            margin-bottom: 5px;
          }

          .subtitle {
            color: #6b7280;
            font-size: 14px;
          }

          .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 30px 0;
            flex-wrap: wrap;
          }

          .stat-card {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 15px 25px;
            text-align: center;
          }

          .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #16a34a;
          }

          .stat-label {
            font-size: 12px;
            color: #6b7280;
          }

          .generation {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }

          .generation-title {
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 18px;
          }

          .members-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
          }

          .member-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
          }

          .member-name {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
          }

          .member-details {
            font-size: 11px;
            color: #6b7280;
          }

          .footer {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 12px;
          }

          @media print {
            body { padding: 20px; }
            .generation { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌳</div>
          <h1>شجرة عائلة آل شايع</h1>
          <p class="subtitle">Al-Shaye Family Tree - التوثيق الرقمي للتراث العائلي</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${stats.totalMembers}</div>
            <div class="stat-label">إجمالي الأفراد</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.generations}</div>
            <div class="stat-label">عدد الأجيال</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.males}</div>
            <div class="stat-label">ذكور</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.females}</div>
            <div class="stat-label">إناث</div>
          </div>
        </div>

        ${Object.entries(generations)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([gen, genMembers]) => `
            <div class="generation">
              <div class="generation-title">
                الجيل ${gen} - ${genMembers.length} فرد
              </div>
              <div class="members-grid">
                ${genMembers.map(member => `
                  <div class="member-card">
                    <div class="member-name">${member.fullNameAr || member.firstName}</div>
                    <div class="member-details">
                      ${member.birthYear ? `مواليد ${member.birthYear}` : ''}
                      ${member.status === 'Deceased' ? ' - متوفى' : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}

        <div class="footer">
          <p>تم إنشاء هذا المستند بواسطة نظام شجرة آل شايع</p>
          <p>Generated on ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const handleExport = async () => {
    if (isLoading) return;
    
    setIsExporting(true);
    setExportComplete(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const htmlContent = generatePDFContent();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      setExportComplete(true);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <div className={`${className} text-red-600 text-sm`}>
        خطأ: {error}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <button
        onClick={handleExport}
        disabled={isExporting || isLoading || members.length === 0}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${exportComplete
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isExporting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>جاري التصدير...</span>
          </>
        ) : exportComplete ? (
          <>
            <CheckCircle size={18} />
            <span>تم التصدير</span>
          </>
        ) : isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>جاري التحميل...</span>
          </>
        ) : (
          <>
            <Download size={18} />
            <span>تصدير PDF {members.length > 0 ? `(${members.length} عضو)` : '(إحصائيات)'}</span>
          </>
        )}
      </button>
    </div>
  );
}
