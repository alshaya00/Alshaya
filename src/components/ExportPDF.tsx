'use client';

import { useState } from 'react';
import { Download, FileText, Loader2, CheckCircle, Share2 } from 'lucide-react';
import { FamilyMember } from '@/lib/types';

interface ExportPDFProps {
  className?: string;
  members: FamilyMember[];
  stats: {
    totalMembers: number;
    generations: number;
    males: number;
    females: number;
  };
}

export default function ExportPDF({ className = '', members, stats }: ExportPDFProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const generatePDFContent = (): string => {

    // Group members by generation
    const generations: Record<number, FamilyMember[]> = {};
    members.forEach((member) => {
      if (!generations[member.generation]) {
        generations[member.generation] = [];
      }
      generations[member.generation].push(member);
    });

    // Generate HTML content for PDF
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

          .gen-header {
            background: linear-gradient(to left, #16a34a, #15803d);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-weight: bold;
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
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 4px;
          }

          .member-id {
            font-size: 11px;
            color: #9ca3af;
          }

          .member-details {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }

          .male { border-right: 4px solid #3b82f6; }
          .female { border-right: 4px solid #ec4899; }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
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
          <p class="subtitle">Al-Shaye Family Tree Registry</p>
        </div>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${stats.totalMembers}</div>
            <div class="stat-label">إجمالي الأعضاء</div>
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
          .map(
            ([gen, members]) => `
          <div class="generation">
            <div class="gen-header">
              الجيل ${gen} (${members.length} عضو)
            </div>
            <div class="members-grid">
              ${members
                .map(
                  (m) => `
                <div class="member-card ${m.gender === 'Male' ? 'male' : 'female'}">
                  <div class="member-name">${m.fullNameAr || m.firstName}</div>
                  <div class="member-id">${m.id}</div>
                  <div class="member-details">
                    ${m.branch || ''} ${m.birthYear ? `• ${m.birthYear}` : ''}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}

        <div class="footer">
          <p>تم التصدير بتاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          <p>شجرة آل شايع - Al-Shaye Family Tree</p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    try {
      const htmlContent = generatePDFContent();

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }

      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareImage = async () => {
    setIsExporting(true);

    try {
      const htmlContent = generatePDFContent();

      // Create a blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Download as HTML file
      const link = document.createElement('a');
      link.href = url;
      link.download = `شجرة_آل_شايع_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : exportComplete ? (
          <CheckCircle size={18} />
        ) : (
          <FileText size={18} />
        )}
        طباعة / PDF
      </button>

      <button
        onClick={handleShareImage}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        تحميل HTML
      </button>
    </div>
  );
}

// Simple export button for embedding in other components
export function ExportButton({ onExport, members }: { onExport?: () => void; members: FamilyMember[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Generate CSV content
      const csvHeader = 'ID,الاسم الكامل,الجنس,الجيل,الفرع,سنة الميلاد,المدينة,المهنة\n';
      const csvRows = members
        .map(
          (m) =>
            `${m.id},"${m.fullNameAr || m.firstName}",${m.gender === 'Male' ? 'ذكر' : 'أنثى'},${m.generation},"${m.branch || ''}",${m.birthYear || ''},"${m.city || ''}","${m.occupation || ''}"`
        )
        .join('\n');

      const csvContent = csvHeader + csvRows;

      // Download CSV
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `آل_شايع_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onExport?.();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-600 rounded-lg transition-all disabled:opacity-50"
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      تصدير CSV
    </button>
  );
}
