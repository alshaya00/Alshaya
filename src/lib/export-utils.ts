// آل شايع Family Tree - Export Utilities

import { FamilyMember, ExportField, ExportOptions, TreeNode } from './types';

// ============================================
// EXPORT FIELD DEFINITIONS
// ============================================

export const ALL_EXPORT_FIELDS: ExportField[] = [
  // Identity fields
  { key: 'id', label: 'ID', labelAr: 'الرقم', selected: true, category: 'identity' },
  { key: 'firstName', label: 'First Name', labelAr: 'الاسم الأول', selected: true, category: 'identity' },
  { key: 'fatherName', label: 'Father Name', labelAr: 'اسم الأب', selected: true, category: 'identity' },
  { key: 'grandfatherName', label: 'Grandfather Name', labelAr: 'اسم الجد', selected: true, category: 'identity' },
  { key: 'greatGrandfatherName', label: 'Great Grandfather', labelAr: 'اسم الجد الثاني', selected: false, category: 'identity' },
  { key: 'familyName', label: 'Family Name', labelAr: 'اسم العائلة', selected: true, category: 'identity' },
  { key: 'fullNameAr', label: 'Full Name (Arabic)', labelAr: 'الاسم الكامل', selected: true, category: 'identity' },
  { key: 'fullNameEn', label: 'Full Name (English)', labelAr: 'الاسم بالإنجليزية', selected: false, category: 'identity' },

  // Family fields
  { key: 'fatherId', label: 'Father ID', labelAr: 'رقم الأب', selected: true, category: 'family' },
  { key: 'gender', label: 'Gender', labelAr: 'الجنس', selected: true, category: 'family' },
  { key: 'generation', label: 'Generation', labelAr: 'الجيل', selected: true, category: 'family' },
  { key: 'branch', label: 'Branch', labelAr: 'الفرع', selected: true, category: 'family' },
  { key: 'sonsCount', label: 'Sons Count', labelAr: 'عدد الأبناء', selected: true, category: 'family' },
  { key: 'daughtersCount', label: 'Daughters Count', labelAr: 'عدد البنات', selected: true, category: 'family' },

  // Personal fields
  { key: 'birthYear', label: 'Birth Year', labelAr: 'سنة الميلاد', selected: true, category: 'personal' },
  { key: 'deathYear', label: 'Death Year', labelAr: 'سنة الوفاة', selected: false, category: 'personal' },
  { key: 'status', label: 'Status', labelAr: 'الحالة', selected: true, category: 'personal' },
  { key: 'occupation', label: 'Occupation', labelAr: 'المهنة', selected: true, category: 'personal' },
  { key: 'biography', label: 'Biography', labelAr: 'السيرة', selected: false, category: 'personal' },
  { key: 'photoUrl', label: 'Photo URL', labelAr: 'رابط الصورة', selected: false, category: 'personal' },

  // Contact fields
  { key: 'phone', label: 'Phone', labelAr: 'الهاتف', selected: true, category: 'contact' },
  { key: 'email', label: 'Email', labelAr: 'البريد', selected: true, category: 'contact' },
  { key: 'city', label: 'City', labelAr: 'المدينة', selected: true, category: 'contact' },
];

// ============================================
// FIELD CATEGORY LABELS
// ============================================

export const FIELD_CATEGORIES = {
  identity: { label: 'Identity', labelAr: 'الهوية' },
  family: { label: 'Family', labelAr: 'العائلة' },
  personal: { label: 'Personal', labelAr: 'شخصي' },
  contact: { label: 'Contact', labelAr: 'التواصل' },
  meta: { label: 'Metadata', labelAr: 'البيانات الوصفية' },
};

// ============================================
// TREE BUILDING FOR EXPORT
// ============================================

export function buildTreeForExport(members: FamilyMember[]): TreeNode[] {
  const memberMap = new Map<string, TreeNode>();

  // Initialize all members with empty children arrays
  members.forEach(member => {
    memberMap.set(member.id, { ...member, children: [] });
  });

  const rootNodes: TreeNode[] = [];

  // Build parent-child relationships
  memberMap.forEach(node => {
    if (node.fatherId && memberMap.has(node.fatherId)) {
      const parent = memberMap.get(node.fatherId)!;
      parent.children.push(node);
    } else if (!node.fatherId) {
      rootNodes.push(node);
    }
  });

  // Sort children by birth year
  const sortChildren = (node: TreeNode): void => {
    node.children.sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));
    node.children.forEach(sortChildren);
  };

  rootNodes.forEach(sortChildren);
  rootNodes.sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));

  return rootNodes;
}

// ============================================
// JSON EXPORT
// ============================================

export function exportToJSON(
  members: FamilyMember[],
  options: ExportOptions
): string {
  const selectedKeys = options.fields
    .filter(f => f.selected)
    .map(f => f.key);

  const filterMember = (member: FamilyMember): Partial<FamilyMember> => {
    const filtered: Partial<FamilyMember> = {};
    selectedKeys.forEach(key => {
      filtered[key] = member[key] as never;
    });
    return filtered;
  };

  if (options.includeTree) {
    const tree = buildTreeForExport(members);

    const filterTreeNode = (node: TreeNode): object => ({
      ...filterMember(node),
      children: node.children.map(filterTreeNode),
    });

    const data = {
      exportDate: new Date().toISOString(),
      format: 'hierarchical',
      totalMembers: members.length,
      fields: selectedKeys,
      tree: tree.map(filterTreeNode),
    };

    return JSON.stringify(data, null, 2);
  }

  if (options.groupByGeneration) {
    const grouped: Record<number, Partial<FamilyMember>[]> = {};
    members.forEach(member => {
      const gen = member.generation;
      if (!grouped[gen]) grouped[gen] = [];
      grouped[gen].push(filterMember(member));
    });

    const data = {
      exportDate: new Date().toISOString(),
      format: 'by_generation',
      totalMembers: members.length,
      fields: selectedKeys,
      generations: Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([gen, members]) => ({
          generation: Number(gen),
          count: members.length,
          members,
        })),
    };

    return JSON.stringify(data, null, 2);
  }

  const data = {
    exportDate: new Date().toISOString(),
    format: 'flat',
    totalMembers: members.length,
    fields: selectedKeys,
    members: members.map(filterMember),
  };

  return JSON.stringify(data, null, 2);
}

// ============================================
// CSV EXPORT
// ============================================

export function exportToCSV(
  members: FamilyMember[],
  options: ExportOptions
): string {
  const selectedFields = options.fields.filter(f => f.selected);

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Header row (Arabic labels)
  const headers = selectedFields.map(f => f.labelAr).join(',');

  // Data rows
  const rows = members.map(member => {
    return selectedFields.map(field => {
      const value = member[field.key];
      if (value === null || value === undefined) return '';

      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',');
  });

  // Group by generation if requested
  if (options.groupByGeneration) {
    const grouped: Record<number, FamilyMember[]> = {};
    members.forEach(member => {
      const gen = member.generation;
      if (!grouped[gen]) grouped[gen] = [];
      grouped[gen].push(member);
    });

    const sections: string[] = [BOM];
    Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([gen, genMembers]) => {
        sections.push(`\n# الجيل ${gen} - Generation ${gen} (${genMembers.length} members)`);
        sections.push(headers);
        genMembers.forEach(member => {
          const row = selectedFields.map(field => {
            const value = member[field.key];
            if (value === null || value === undefined) return '';
            const strValue = String(value);
            if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          }).join(',');
          sections.push(row);
        });
      });

    return sections.join('\n');
  }

  return BOM + headers + '\n' + rows.join('\n');
}

// ============================================
// HUMAN-READABLE TEXT EXPORT (for tree view)
// ============================================

export function exportToReadableText(members: FamilyMember[]): string {
  const tree = buildTreeForExport(members);
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    شجرة آل شايع العائلية                         ');
  lines.push('                    Al-Shaye Family Tree                         ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}`);
  lines.push(`إجمالي الأعضاء: ${members.length}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Group by generation
  const byGeneration: Record<number, FamilyMember[]> = {};
  members.forEach(m => {
    if (!byGeneration[m.generation]) byGeneration[m.generation] = [];
    byGeneration[m.generation].push(m);
  });

  Object.entries(byGeneration)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([gen, genMembers]) => {
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push(`  الجيل ${gen} - Generation ${gen}  │  ${genMembers.length} أعضاء`);
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('');

      genMembers
        .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999))
        .forEach(member => {
          const genderIcon = member.gender?.toUpperCase() === 'MALE' ? '👨' : '👩';
          const statusIcon = member.status === 'Living' ? '🟢' : '⚫';

          lines.push(`  ${genderIcon} ${member.fullNameAr || member.firstName}`);
          lines.push(`     رقم: ${member.id} │ الفرع: ${member.branch || '-'}`);

          if (member.birthYear) {
            lines.push(`     الميلاد: ${member.birthYear}${member.status === 'Deceased' ? ` - الوفاة: ${member.deathYear || '؟'}` : ''}`);
          }

          if (member.city || member.occupation) {
            lines.push(`     ${member.city ? `المدينة: ${member.city}` : ''}${member.city && member.occupation ? ' │ ' : ''}${member.occupation ? `المهنة: ${member.occupation}` : ''}`);
          }

          if (member.phone || member.email) {
            lines.push(`     ${member.phone ? `الهاتف: ${member.phone}` : ''}${member.phone && member.email ? ' │ ' : ''}${member.email ? `البريد: ${member.email}` : ''}`);
          }

          lines.push(`     الحالة: ${statusIcon} ${member.status === 'Living' ? 'على قيد الحياة' : 'متوفى'}`);

          if (member.sonsCount > 0 || member.daughtersCount > 0) {
            lines.push(`     الأبناء: ${member.sonsCount} رجال، ${member.daughtersCount} نساء`);
          }

          lines.push('');
        });

      lines.push('');
    });

  // Add hierarchical tree view
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    الشجرة الهرمية                              ');
  lines.push('                    Hierarchical Tree                           ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  const renderTreeNode = (node: TreeNode, prefix: string = '', isLast: boolean = true): void => {
    const connector = isLast ? '└── ' : '├── ';
    const genderIcon = node.gender?.toUpperCase() === 'MALE' ? '♂' : '♀';
    const statusIcon = node.status === 'Living' ? '' : ' ✝';

    lines.push(`${prefix}${connector}${genderIcon} ${node.fullNameAr || node.firstName} (${node.id})${statusIcon}`);

    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, index) => {
      renderTreeNode(child, childPrefix, index === node.children.length - 1);
    });
  };

  tree.forEach((root, index) => {
    renderTreeNode(root, '', index === tree.length - 1);
  });

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                         نهاية التقرير                          ');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ============================================
// PDF/HTML EXPORT
// ============================================

export function exportToHTML(
  members: FamilyMember[],
  options: ExportOptions
): string {
  const selectedFields = options.fields.filter(f => f.selected);
  const tree = buildTreeForExport(members);

  // Group by generation
  const byGeneration: Record<number, FamilyMember[]> = {};
  members.forEach(m => {
    if (!byGeneration[m.generation]) byGeneration[m.generation] = [];
    byGeneration[m.generation].push(m);
  });

  const generationColors = [
    '#DC2626', '#EA580C', '#D97706', '#CA8A04',
    '#65A30D', '#16A34A', '#0D9488', '#0284C7',
  ];

  const renderTreeNodeHTML = (node: TreeNode, level: number = 0): string => {
    const genderColor = node.gender?.toUpperCase() === 'MALE' ? '#3B82F6' : '#EC4899';
    const statusClass = node.status === 'Living' ? '' : 'text-gray-400';

    return `
      <div style="margin-right: ${level * 24}px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: ${genderColor}; font-weight: bold;">${node.gender?.toUpperCase() === 'MALE' ? '♂' : '♀'}</span>
          <span class="${statusClass}">${node.fullNameAr || node.firstName}</span>
          <span style="color: #9CA3AF; font-size: 12px;">(${node.id})</span>
          ${node.status === 'Deceased' ? '<span style="color: #9CA3AF;">✝</span>' : ''}
        </div>
        ${node.children.length > 0 ? `
          <div style="border-right: 2px solid #E5E7EB; margin-right: 8px; padding-right: 8px;">
            ${node.children.map(child => renderTreeNodeHTML(child, level + 1)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>شجرة آل شايع العائلية - Family Tree Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #F3F4F6;
      padding: 20px;
      direction: rtl;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%);
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-value { font-size: 2em; font-weight: bold; color: #1E3A5F; }
    .stat-label { color: #6B7280; }
    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 1.5em;
      color: #1E3A5F;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    .generation-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0 16px 0;
    }
    .generation-badge {
      padding: 4px 12px;
      border-radius: 9999px;
      color: white;
      font-weight: bold;
    }
    .member-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .member-card {
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      transition: box-shadow 0.2s;
    }
    .member-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .member-card.male { border-right: 4px solid #3B82F6; }
    .member-card.female { border-right: 4px solid #EC4899; }
    .member-card.deceased { opacity: 0.7; }
    .member-name { font-weight: bold; font-size: 1.1em; margin-bottom: 4px; }
    .member-id { color: #9CA3AF; font-size: 0.9em; }
    .member-details { margin-top: 8px; font-size: 0.9em; color: #6B7280; }
    .tree-view { padding: 16px; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6B7280;
    }
    @media print {
      body { background: white; padding: 0; }
      .section { box-shadow: none; border: 1px solid #E5E7EB; page-break-inside: avoid; }
      .member-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>شجرة آل شايع العائلية</h1>
      <p>Al-Shaye Family Tree</p>
      <p style="margin-top: 12px; font-size: 0.9em;">
        تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')} │
        Export Date: ${new Date().toLocaleDateString('en-US')}
      </p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${members.length}</div>
        <div class="stat-label">إجمالي الأعضاء</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${members.filter(m => m.gender?.toUpperCase() === 'MALE').length}</div>
        <div class="stat-label">رجال</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${members.filter(m => m.gender?.toUpperCase() === 'FEMALE').length}</div>
        <div class="stat-label">نساء</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(byGeneration).length}</div>
        <div class="stat-label">أجيال</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${members.filter(m => m.status === 'Living').length}</div>
        <div class="stat-label">أحياء</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">الأعضاء حسب الجيل - Members by Generation</h2>
      ${Object.entries(byGeneration)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([gen, genMembers]) => `
          <div class="generation-header">
            <span class="generation-badge" style="background-color: ${generationColors[Number(gen) - 1] || '#6B7280'}">
              الجيل ${gen}
            </span>
            <span style="color: #6B7280;">${genMembers.length} أعضاء</span>
          </div>
          <div class="member-grid">
            ${genMembers
              .sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999))
              .map(member => `
                <div class="member-card ${member.gender.toLowerCase()} ${member.status === 'Deceased' ? 'deceased' : ''}">
                  <div class="member-name">${member.fullNameAr || member.firstName}</div>
                  <div class="member-id">${member.id} │ ${member.branch || 'الأصل'}</div>
                  <div class="member-details">
                    ${member.birthYear ? `الميلاد: ${member.birthYear}` : ''}
                    ${member.status === 'Deceased' ? ' │ متوفى' : ''}
                    ${member.city ? `<br>المدينة: ${member.city}` : ''}
                    ${member.occupation ? `<br>المهنة: ${member.occupation}` : ''}
                    ${member.phone ? `<br>الهاتف: ${member.phone}` : ''}
                  </div>
                </div>
              `).join('')}
          </div>
        `).join('')}
    </div>

    ${options.includeTree ? `
      <div class="section">
        <h2 class="section-title">الشجرة الهرمية - Hierarchical Tree</h2>
        <div class="tree-view">
          ${tree.map(node => renderTreeNodeHTML(node)).join('')}
        </div>
      </div>
    ` : ''}

    <div class="footer">
      <p>تم إنشاء هذا التقرير بواسطة نظام شجرة آل شايع العائلية</p>
      <p>Generated by Al-Shaye Family Tree System</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================
// DOWNLOAD HELPERS
// ============================================

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFilename(format: string): string {
  const date = new Date().toISOString().split('T')[0];
  const baseName = `شجرة_آل_شايع_${date}`;

  switch (format) {
    case 'JSON': return `${baseName}.json`;
    case 'CSV': return `${baseName}.csv`;
    case 'PDF': return `${baseName}.html`;
    case 'TXT': return `${baseName}.txt`;
    default: return `${baseName}.txt`;
  }
}

export function getMimeType(format: string): string {
  switch (format) {
    case 'JSON': return 'application/json;charset=utf-8';
    case 'CSV': return 'text/csv;charset=utf-8';
    case 'PDF': return 'text/html;charset=utf-8';
    case 'TXT': return 'text/plain;charset=utf-8';
    default: return 'text/plain;charset=utf-8';
  }
}
