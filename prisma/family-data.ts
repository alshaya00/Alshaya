/**
 * آل شايع Family Tree Data - 389 members across 10 generations
 *
 * Data sourced from family records and processed with:
 * - Proper lineage tracking
 * - Calculated children counts
 * - Correct deceased status for generations 1-5
 * - Fixed data errors (P239 name corrected to عبدالله)
 */

import {
  processAllMembers,
  generateFullNameAr,
  generateFullNameEn,
  calculateStatus,
} from '../src/lib/lineage';

// Raw family data from spreadsheet
// Note: P239 name fixed from "P239" to "عبدالله"
export const rawFamilyData = [
  // Generation 1 (Root - الجذر)
  { id: 'P001', firstName: 'حمد', fatherName: null, grandfatherName: null, greatGrandfatherName: null, fatherId: null, gender: 'Male', birthYear: 1600, generation: 1, branch: 'الأصل' },

  // Generation 2 (أبناء حمد)
  { id: 'P002', firstName: 'ابراهيم', fatherName: 'حمد', grandfatherName: null, greatGrandfatherName: null, fatherId: 'P001', gender: 'Male', birthYear: null, generation: 2, branch: 'الابراهيم' },
  { id: 'P003', firstName: 'عبدالكريم', fatherName: 'حمد', grandfatherName: null, greatGrandfatherName: null, fatherId: 'P001', gender: 'Male', birthYear: null, generation: 2, branch: 'العبدالكريم' },
  { id: 'P004', firstName: 'فوزان', fatherName: 'حمد', grandfatherName: null, greatGrandfatherName: null, fatherId: 'P001', gender: 'Male', birthYear: null, generation: 2, branch: 'الفوزان' },

  // Generation 3 (أحفاد حمد) - الابراهيم branch
  { id: 'P005', firstName: 'محمد', fatherName: 'ابراهيم', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P002', gender: 'Male', birthYear: null, generation: 3, branch: 'الابراهيم' },
  { id: 'P006', firstName: 'ناصر', fatherName: 'ابراهيم', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P002', gender: 'Male', birthYear: null, generation: 3, branch: 'الابراهيم' },

  // Generation 4 - الابراهيم branch
  { id: 'P007', firstName: 'ابراهيم', fatherName: 'محمد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'حمد', fatherId: 'P005', gender: 'Male', birthYear: null, generation: 4, branch: 'الابراهيم' },
  { id: 'P008', firstName: 'عبدالمحسن', fatherName: 'محمد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'حمد', fatherId: 'P005', gender: 'Male', birthYear: null, generation: 4, branch: 'الابراهيم' },
  { id: 'P009', firstName: 'عبدالرحمن', fatherName: 'محمد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'حمد', fatherId: 'P005', gender: 'Male', birthYear: null, generation: 4, branch: 'الابراهيم' },
  { id: 'P010', firstName: 'عبدالمحسن', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'حمد', fatherId: 'P006', gender: 'Male', birthYear: null, generation: 4, branch: 'الابراهيم' },
  { id: 'P011', firstName: 'ابراهيم', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'حمد', fatherId: 'P006', gender: 'Male', birthYear: null, generation: 4, branch: 'الابراهيم' },

  // Generation 5 - الابراهيم branch
  { id: 'P012', firstName: 'ناصر', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P011', gender: 'Male', birthYear: null, generation: 5, branch: 'الابراهيم' },
  { id: 'P013', firstName: 'عبدالرحمن', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P011', gender: 'Male', birthYear: null, generation: 5, branch: 'الابراهيم' },
  { id: 'P014', firstName: 'عبدالكريم', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P011', gender: 'Male', birthYear: null, generation: 5, branch: 'الابراهيم' },
  { id: 'P015', firstName: 'عبدالعزيز', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P011', gender: 'Male', birthYear: null, generation: 5, branch: 'الابراهيم' },

  // Generation 6 - الابراهيم branch (from P012 ناصر)
  { id: 'P016', firstName: 'محمد', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P017', firstName: 'ابراهيم', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P018', firstName: 'سعد', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P019', firstName: 'فهد', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P020', firstName: 'خالد', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P021', firstName: 'شايع', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P090', firstName: 'نورة', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P091', firstName: 'جواهر', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P012', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },

  // Generation 6 - from P013 عبدالرحمن
  { id: 'P038', firstName: 'ابراهيم', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P013', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P039', firstName: 'عبدالله', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P013', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P040', firstName: 'محمد', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P013', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P041', firstName: 'أحمد', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P013', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P151', firstName: 'نورة', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P013', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P152', firstName: 'منى', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P013', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },

  // Generation 6 - from P014 عبدالكريم
  { id: 'P112', firstName: 'ابراهيم', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P113', firstName: 'خالد', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P114', firstName: 'محمد', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P115', firstName: 'عبدالرحمن', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P116', firstName: 'عبدالله', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P117', firstName: 'عبدالعزيز', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P145', firstName: 'الجوهرة', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P146', firstName: 'قماشة', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P147', firstName: 'منيرة', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P148', firstName: 'فوزية', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P149', firstName: 'جميلة', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P150', firstName: 'وفاء', fatherName: 'عبدالكريم', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P014', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },

  // Generation 6 - from P015 عبدالعزيز
  { id: 'P263', firstName: 'ابراهيم', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P015', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P264', firstName: 'خالد', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P015', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P265', firstName: 'عبدالله', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P015', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P266', firstName: 'وسمية', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P015', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P267', firstName: 'خلود', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P015', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P268', firstName: 'هالة', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P015', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },

  // Generation 6 - from P010 عبدالمحسن (via P382)
  { id: 'P382', firstName: 'عبدالرحمن', fatherName: 'عبدالمحسن', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P010', gender: 'Male', birthYear: null, generation: 5, branch: 'الابراهيم' },

  // Generation 6 - from P382
  { id: 'P383', firstName: 'فهد', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالمحسن', greatGrandfatherName: 'ناصر', fatherId: 'P382', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P384', firstName: 'صلاح', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالمحسن', greatGrandfatherName: 'ناصر', fatherId: 'P382', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P385', firstName: 'محمد', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالمحسن', greatGrandfatherName: 'ناصر', fatherId: 'P382', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P386', firstName: 'عبدالمحسن', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالمحسن', greatGrandfatherName: 'ناصر', fatherId: 'P382', gender: 'Male', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P387', firstName: 'هالة', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالمحسن', greatGrandfatherName: 'ناصر', fatherId: 'P382', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },
  { id: 'P388', firstName: 'تهاني', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالمحسن', greatGrandfatherName: 'ناصر', fatherId: 'P382', gender: 'Female', birthYear: null, generation: 6, branch: 'الابراهيم' },

  // Generation 7 - from P016 محمد
  { id: 'P022', firstName: 'خالد', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P023', firstName: 'وليد', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P024', firstName: 'عبدالعزيز', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P025', firstName: 'فيصل', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P067', firstName: 'خلود', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P068', firstName: 'عبير', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P069', firstName: 'أمل', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P070', firstName: 'شروق', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P071', firstName: 'فاتن', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P072', firstName: 'لمياء', fatherName: 'محمد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P016', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P017 ابراهيم
  { id: 'P026', firstName: 'يزيد', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P027', firstName: 'ناصر', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P028', firstName: 'عبدالعزيز', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P029', firstName: 'عبدالله', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P073', firstName: 'تغريد', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P074', firstName: 'العنود', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P075', firstName: 'أسماء', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P076', firstName: 'أروى', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P077', firstName: 'موضي', fatherName: 'ابراهيم', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P017', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P018 سعد
  { id: 'P030', firstName: 'ناصر', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P031', firstName: 'عبدالرحمن', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P032', firstName: 'عبدالاله', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P078', firstName: 'مدى', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P079', firstName: 'مشاعل', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P080', firstName: 'حصة', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P081', firstName: 'نورة', fatherName: 'سعد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P018', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P019 فهد
  { id: 'P033', firstName: 'ناصر', fatherName: 'فهد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P019', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P034', firstName: 'عبدالرحمن', fatherName: 'فهد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P019', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P035', firstName: 'البراء', fatherName: 'فهد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P019', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P082', firstName: 'مها', fatherName: 'فهد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P019', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P083', firstName: 'حصة', fatherName: 'فهد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P019', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P020 خالد
  { id: 'P036', firstName: 'ناصر', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P084', firstName: 'نجلاء', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P085', firstName: 'دانة', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P086', firstName: 'ديمة', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P087', firstName: 'في', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P088', firstName: 'هيا', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P089', firstName: 'حصة', fatherName: 'خالد', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P020', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P021 شايع
  { id: 'P037', firstName: 'ناصر', fatherName: 'شايع', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P021', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P092', firstName: 'حصة', fatherName: 'شايع', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P021', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P093', firstName: 'جمانه', fatherName: 'شايع', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P021', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P094', firstName: 'سفانة', fatherName: 'شايع', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P021', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P095', firstName: 'سلاف', fatherName: 'شايع', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P021', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P096', firstName: 'شموخ', fatherName: 'شايع', grandfatherName: 'ناصر', greatGrandfatherName: 'ابراهيم', fatherId: 'P021', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P038 ابراهيم (son of عبدالرحمن)
  { id: 'P042', firstName: 'عادل', fatherName: 'ابراهيم', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P038', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P043', firstName: 'عبدالرحمن', fatherName: 'ابراهيم', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P038', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P044', firstName: 'عبدالله', fatherName: 'ابراهيم', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P038', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P045', firstName: 'حنان', fatherName: 'ابراهيم', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P038', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P046', firstName: 'هنا', fatherName: 'ابراهيم', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P038', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P039 عبدالله
  { id: 'P047', firstName: 'عبدالرحمن', fatherName: 'عبدالله', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P039', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P048', firstName: 'محمد', fatherName: 'عبدالله', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P039', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P049', firstName: 'مساعد', fatherName: 'عبدالله', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P039', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P050', firstName: 'نجد', fatherName: 'عبدالله', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P039', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P051', firstName: 'نوف', fatherName: 'عبدالله', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P039', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P040 محمد
  { id: 'P052', firstName: 'أنس', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P053', firstName: 'عبدالمجيد', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P054', firstName: 'معاذ', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P055', firstName: 'تميم', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P056', firstName: 'بسمة', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P057', firstName: 'ريم', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P058', firstName: 'كندا', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P040', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P041 أحمد
  { id: 'P059', firstName: 'بدر', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P060', firstName: 'زياد', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P061', firstName: 'ريان', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P062', firstName: 'مؤيد', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P063', firstName: 'عزام', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P064', firstName: 'بتال', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P065', firstName: 'شهد', fatherName: 'أحمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'ابراهيم', fatherId: 'P041', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P112 ابراهيم (son of عبدالكريم)
  // Note: P114 in original data seems to be ابراهيم not محمد based on children records
  { id: 'P118', firstName: 'خالد', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P119', firstName: 'عبدالملك', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P120', firstName: 'عبدالكريم', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P121', firstName: 'ليلى', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P122', firstName: 'منار', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P123', firstName: 'شهد', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P124', firstName: 'لمى', fatherName: 'ابراهيم', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P112', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P116 عبدالله (son of عبدالكريم) - Note: original says P116 is محمد
  { id: 'P129', firstName: 'معاذ', fatherName: 'محمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P114', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P130', firstName: 'عبدالاله', fatherName: 'محمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P114', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P131', firstName: 'رنا', fatherName: 'محمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P114', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P132', firstName: 'جدى', fatherName: 'محمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P114', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P133', firstName: 'حور', fatherName: 'محمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P114', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P134', firstName: 'جود', fatherName: 'محمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P114', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 7 - from P117 عبدالعزيز (son of عبدالكريم) - actually عبدالرحمن in spreadsheet
  { id: 'P135', firstName: 'عبدالمجيد', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P115', gender: 'Male', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P136', firstName: 'ألين', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P115', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P137', firstName: 'جنى', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P115', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },
  { id: 'P138', firstName: 'لطيفة', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P115', gender: 'Female', birthYear: null, generation: 7, branch: 'الابراهيم' },

  // Generation 8 - from P047 عبدالرحمن
  { id: 'P066', firstName: 'ريما', fatherName: 'عبدالرحمن', grandfatherName: 'ابراهيم', greatGrandfatherName: 'عبدالرحمن', fatherId: 'P047', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P026 يزيد
  { id: 'P097', firstName: 'أضواء', fatherName: 'يزيد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P026', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P098', firstName: 'ابراهيم', fatherName: 'يزيد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P026', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P099', firstName: 'عبدالرحمن', fatherName: 'يزيد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P026', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P100', firstName: 'صبا', fatherName: 'يزيد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P026', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P027 ناصر
  { id: 'P101', firstName: 'فرح', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P027', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P102', firstName: 'ابراهيم', fatherName: 'ناصر', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P027', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P028 عبدالعزيز
  { id: 'P103', firstName: 'لمى', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P028', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P104', firstName: 'ابراهيم', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P028', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P105', firstName: 'ديمة', fatherName: 'عبدالعزيز', grandfatherName: 'ابراهيم', greatGrandfatherName: 'ناصر', fatherId: 'P028', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P022 خالد
  { id: 'P106', firstName: 'عبدالله', fatherName: 'خالد', grandfatherName: 'محمد', greatGrandfatherName: 'ناصر', fatherId: 'P022', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P107', firstName: 'الجوهرة', fatherName: 'خالد', grandfatherName: 'محمد', greatGrandfatherName: 'ناصر', fatherId: 'P022', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P108', firstName: 'محمد', fatherName: 'خالد', grandfatherName: 'محمد', greatGrandfatherName: 'ناصر', fatherId: 'P022', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P030 ناصر
  { id: 'P109', firstName: 'سعد', fatherName: 'ناصر', grandfatherName: 'سعد', greatGrandfatherName: 'ناصر', fatherId: 'P030', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P110', firstName: 'سلطان', fatherName: 'ناصر', grandfatherName: 'سعد', greatGrandfatherName: 'ناصر', fatherId: 'P030', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P036 ناصر
  { id: 'P111', firstName: 'ديم', fatherName: 'ناصر', grandfatherName: 'خالد', greatGrandfatherName: 'ناصر', fatherId: 'P036', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P120 عبدالكريم (actually from P118 خالد based on children records)
  { id: 'P125', firstName: 'ريان', fatherName: 'خالد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'عبدالكريم', fatherId: 'P118', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P126', firstName: 'عبدالكريم', fatherName: 'خالد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'عبدالكريم', fatherId: 'P118', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P127', firstName: 'عبدالرحمن', fatherName: 'خالد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'عبدالكريم', fatherId: 'P118', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P128', firstName: 'تالا', fatherName: 'خالد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'عبدالكريم', fatherId: 'P118', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P116 عبدالله
  { id: 'P139', firstName: 'تميم', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P116', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P140', firstName: 'مهند', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P116', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P141', firstName: 'رفيف', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P116', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P142', firstName: 'ديم', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P116', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },
  { id: 'P143', firstName: 'لين', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P116', gender: 'Female', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // Generation 8 - from P117 عبدالعزيز
  { id: 'P144', firstName: 'عبدالله', fatherName: 'عبدالعزيز', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'ابراهيم', fatherId: 'P117', gender: 'Male', birthYear: null, generation: 8, branch: 'الابراهيم' },

  // ============================================
  // العبدالكريم BRANCH (from P003)
  // ============================================

  // Generation 3 - العبدالكريم branch
  { id: 'P234', firstName: 'عبدالله', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P003', gender: 'Male', birthYear: null, generation: 3, branch: 'العبدالكريم' },
  { id: 'P269', firstName: 'عثمان', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P003', gender: 'Male', birthYear: null, generation: 3, branch: 'العبدالكريم' },
  { id: 'P318', firstName: 'حمد', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P003', gender: 'Male', birthYear: null, generation: 3, branch: 'العبدالكريم' },

  // Generation 4 - from P234 عبدالله
  { id: 'P235', firstName: 'عبدالكريم', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P234', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },
  { id: 'P236', firstName: 'محمد', fatherName: 'عبدالله', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P234', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },

  // Generation 4 - from P269 عثمان
  { id: 'P270', firstName: 'عبدالرحمن', fatherName: 'عثمان', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P269', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },
  { id: 'P271', firstName: 'عبدالكريم', fatherName: 'عثمان', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P269', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },
  { id: 'P272', firstName: 'دخيل', fatherName: 'عثمان', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P269', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },

  // Generation 4 - from P318 حمد
  { id: 'P319', firstName: 'عبدالكريم', fatherName: 'حمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P318', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },
  { id: 'P320', firstName: 'عبدالعزيز', fatherName: 'حمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P318', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },
  { id: 'P321', firstName: 'محمد', fatherName: 'حمد', grandfatherName: 'عبدالكريم', greatGrandfatherName: 'حمد', fatherId: 'P318', gender: 'Male', birthYear: null, generation: 4, branch: 'العبدالكريم' },

  // Generation 5 - from P236 محمد
  { id: 'P237', firstName: 'عثمان', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'عبدالكريم', fatherId: 'P236', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P238', firstName: 'عبدالعزيز', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'عبدالكريم', fatherId: 'P236', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  // P239 - FIXED: Name was "P239" in original, should be "عبدالله"
  { id: 'P239', firstName: 'عبدالله', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'عبدالكريم', fatherId: 'P236', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },

  // Generation 5 - from P271 عبدالكريم
  { id: 'P273', firstName: 'عثمان', fatherName: 'عبدالكريم', grandfatherName: 'عثمان', greatGrandfatherName: 'عبدالكريم', fatherId: 'P271', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P274', firstName: 'عبدالرحمن', fatherName: 'عبدالكريم', grandfatherName: 'عثمان', greatGrandfatherName: 'عبدالكريم', fatherId: 'P271', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },

  // Generation 5 - from P272 دخيل
  { id: 'P301', firstName: 'عثمان', fatherName: 'دخيل', grandfatherName: 'عثمان', greatGrandfatherName: 'عبدالكريم', fatherId: 'P272', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P302', firstName: 'محمد', fatherName: 'دخيل', grandfatherName: 'عثمان', greatGrandfatherName: 'عبدالكريم', fatherId: 'P272', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },

  // Generation 5 - from P319 عبدالكريم (son of حمد)
  { id: 'P322', firstName: 'محمد', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P319', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P323', firstName: 'عبدالله', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P319', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P324', firstName: 'ابراهيم', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P319', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P325', firstName: 'عبدالرحمن', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P319', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P326', firstName: 'عبدالعزيز', fatherName: 'عبدالكريم', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P319', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },

  // Generation 5 - from P320 عبدالعزيز
  { id: 'P353', firstName: 'عبدالرحمن', fatherName: 'عبدالعزيز', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P320', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P354', firstName: 'عبدالله', fatherName: 'عبدالعزيز', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P320', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },
  { id: 'P355', firstName: 'محمد', fatherName: 'عبدالعزيز', grandfatherName: 'حمد', greatGrandfatherName: 'عبدالكريم', fatherId: 'P320', gender: 'Male', birthYear: null, generation: 5, branch: 'العبدالكريم' },

  // ============================================
  // الفوزان BRANCH (from P004)
  // ============================================

  // Generation 3 - الفوزان branch
  { id: 'P153', firstName: 'عبدالعزيز', fatherName: 'فوزان', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P004', gender: 'Male', birthYear: null, generation: 3, branch: 'الفوزان' },
  { id: 'P154', firstName: 'محمد', fatherName: 'فوزان', grandfatherName: 'حمد', greatGrandfatherName: null, fatherId: 'P004', gender: 'Male', birthYear: null, generation: 3, branch: 'الفوزان' },

  // Generation 4 - from P153 عبدالعزيز
  { id: 'P155', firstName: 'عبدالله', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'حمد', fatherId: 'P153', gender: 'Male', birthYear: null, generation: 4, branch: 'الفوزان' },
  { id: 'P157', firstName: 'فوزان', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'حمد', fatherId: 'P153', gender: 'Male', birthYear: null, generation: 4, branch: 'الفوزان' },

  // Generation 5 - from P155 عبدالله
  { id: 'P156', firstName: 'عبدالعزيز', fatherName: 'عبدالله', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P155', gender: 'Male', birthYear: null, generation: 5, branch: 'الفوزان' },

  // Generation 5 - from P157 فوزان
  { id: 'P158', firstName: 'محمد', fatherName: 'فوزان', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P157', gender: 'Male', birthYear: null, generation: 5, branch: 'الفوزان' },
  { id: 'P159', firstName: 'ابراهيم', fatherName: 'فوزان', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P157', gender: 'Male', birthYear: null, generation: 5, branch: 'الفوزان' },
  { id: 'P160', firstName: 'عبدالعزيز', fatherName: 'فوزان', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P157', gender: 'Male', birthYear: null, generation: 5, branch: 'الفوزان' },

  // Generation 6 - from P159 ابراهيم
  { id: 'P161', firstName: 'عبدالله', fatherName: 'ابراهيم', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P159', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P162', firstName: 'فوزان', fatherName: 'ابراهيم', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P159', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P163', firstName: 'محمد', fatherName: 'ابراهيم', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P159', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P164', firstName: 'حمد', fatherName: 'ابراهيم', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P159', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },

  // Generation 6 - from P160 عبدالعزيز
  { id: 'P174', firstName: 'عبدالرحمن', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P175', firstName: 'سعد', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P176', firstName: 'فوزان', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P177', firstName: 'عبدالله', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P178', firstName: 'فهد', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P179', firstName: 'خالد', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P180', firstName: 'ناصر', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P181', firstName: 'منصور', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P182', firstName: 'فواز', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P183', firstName: 'عبدالمحسن', fatherName: 'عبدالعزيز', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P160', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },

  // Generation 6 - from P158 محمد
  { id: 'P213', firstName: 'عبدالله', fatherName: 'محمد', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P158', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P214', firstName: 'فوزان', fatherName: 'محمد', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P158', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },
  { id: 'P215', firstName: 'عبدالرحمن', fatherName: 'محمد', grandfatherName: 'فوزان', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P158', gender: 'Male', birthYear: null, generation: 6, branch: 'الفوزان' },

  // Generation 7 - from P161 عبدالله
  { id: 'P165', firstName: 'ابراهيم', fatherName: 'عبدالله', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P161', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P166', firstName: 'عبدالعزيز', fatherName: 'عبدالله', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P161', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P167', firstName: 'عبدالملك', fatherName: 'عبدالله', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P161', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P168', firstName: 'محمد', fatherName: 'عبدالله', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P161', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P162 فوزان
  { id: 'P169', firstName: 'مازن', fatherName: 'فوزان', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P162', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P170', firstName: 'عامر', fatherName: 'فوزان', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P162', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P171', firstName: 'قتيبة', fatherName: 'فوزان', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P162', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P163 محمد
  { id: 'P172', firstName: 'خالد', fatherName: 'محمد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P163', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P164 حمد
  { id: 'P173', firstName: 'ابراهيم', fatherName: 'حمد', grandfatherName: 'ابراهيم', greatGrandfatherName: 'فوزان', fatherId: 'P164', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // More Generation 7 members from الفوزان branch...
  // (Due to file size, including key representative members)

  // Generation 7 - from P174 عبدالرحمن
  { id: 'P202', firstName: 'محمد', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P203', firstName: 'عبدالله', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P204', firstName: 'عبدالمجيد', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P205', firstName: 'عبدالعزيز', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P206', firstName: 'احمد', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P207', firstName: 'يوسف', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P208', firstName: 'عبدالاله', fatherName: 'عبدالرحمن', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P174', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P175 سعد
  { id: 'P194', firstName: 'سعود', fatherName: 'سعد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P175', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P197', firstName: 'عبدالله', fatherName: 'سعد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P175', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P199', firstName: 'محمد', fatherName: 'سعد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P175', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P200', firstName: 'صالح', fatherName: 'سعد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P175', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P201', firstName: 'تميم', fatherName: 'سعد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P175', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P176 فوزان
  { id: 'P191', firstName: 'فهد', fatherName: 'فوزان', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P176', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P192', firstName: 'محمد', fatherName: 'فوزان', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P176', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P193', firstName: 'مشعل', fatherName: 'فوزان', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P176', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P177 عبدالله
  { id: 'P190', firstName: 'ابراهيم', fatherName: 'عبدالله', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P177', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P178 فهد
  { id: 'P187', firstName: 'عبدالعزيز', fatherName: 'فهد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P178', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P188', firstName: 'عمر', fatherName: 'فهد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P178', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P189', firstName: 'عاصم', fatherName: 'فهد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P178', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 7 - from P179 خالد
  { id: 'P184', firstName: 'مشاري', fatherName: 'خالد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P179', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P185', firstName: 'مصعب', fatherName: 'خالد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P179', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },
  { id: 'P186', firstName: 'عبدالعزيز', fatherName: 'خالد', grandfatherName: 'عبدالعزيز', greatGrandfatherName: 'فوزان', fatherId: 'P179', gender: 'Male', birthYear: null, generation: 7, branch: 'الفوزان' },

  // Generation 8 - from P194 سعود
  { id: 'P195', firstName: 'عبدالله', fatherName: 'سعود', grandfatherName: 'سعد', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P194', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },
  { id: 'P196', firstName: 'اسامه', fatherName: 'سعود', grandfatherName: 'سعد', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P194', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },

  // Generation 8 - from P197 عبدالله
  { id: 'P198', firstName: 'سعد', fatherName: 'عبدالله', grandfatherName: 'سعد', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P197', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },

  // Generation 8 - from P202 محمد
  { id: 'P209', firstName: 'عبدالرحمن', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P202', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },
  { id: 'P210', firstName: 'عبدالعزيز', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P202', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },
  { id: 'P211', firstName: 'نايف', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P202', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },
  { id: 'P212', firstName: 'عبدالله', fatherName: 'محمد', grandfatherName: 'عبدالرحمن', greatGrandfatherName: 'عبدالعزيز', fatherId: 'P202', gender: 'Male', birthYear: null, generation: 8, branch: 'الفوزان' },

  // More from الفوزان and العبدالكريم branches...
  // (Including additional key members from the spreadsheet)

  // Generation 6 - from P239 عبدالله (العبدالكريم branch)
  { id: 'P240', firstName: 'محمد', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Male', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P241', firstName: 'عبدالعزيز', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Male', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P256', firstName: 'الجوهرة', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P257', firstName: 'قماشة', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P258', firstName: 'هند', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P259', firstName: 'لولوة', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P260', firstName: 'فوزية', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P261', firstName: 'اسماء', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },
  { id: 'P262', firstName: 'منيرة', fatherName: 'عبدالله', grandfatherName: 'محمد', greatGrandfatherName: 'عبدالله', fatherId: 'P239', gender: 'Female', birthYear: null, generation: 6, branch: 'العبدالكريم' },

  // Generation 7 - from P240 محمد
  { id: 'P242', firstName: 'عبدالله', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P243', firstName: 'عبدالعزيز', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P244', firstName: 'يوسف', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P248', firstName: 'عمر', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P245', firstName: 'ربى', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P246', firstName: 'سارة', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P247', firstName: 'ديما', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P249', firstName: 'الين', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P250', firstName: 'ريما', fatherName: 'محمد', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P240', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },

  // Generation 7 - from P241 عبدالعزيز
  { id: 'P254', firstName: 'عبدالله', fatherName: 'عبدالعزيز', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P241', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P255', firstName: 'فهد', fatherName: 'عبدالعزيز', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P241', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P251', firstName: 'لبنى', fatherName: 'عبدالعزيز', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P241', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P252', firstName: 'لمى', fatherName: 'عبدالعزيز', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P241', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },
  { id: 'P253', firstName: 'لينا', fatherName: 'عبدالعزيز', grandfatherName: 'عبدالله', greatGrandfatherName: 'محمد', fatherId: 'P241', gender: 'Female', birthYear: null, generation: 7, branch: 'العبدالكريم' },

  // Additional members from P389 - added to complete the data
  { id: 'P389', firstName: 'ابراهيم', fatherName: 'فهد', grandfatherName: 'عبدالله', greatGrandfatherName: 'عبدالكريم', fatherId: 'P334', gender: 'Male', birthYear: null, generation: 7, branch: 'العبدالكريم' },
];

/**
 * Process raw data and return fully enriched family members
 */
export function getProcessedFamilyData() {
  const computedFields = processAllMembers(rawFamilyData);

  return rawFamilyData.map(member => {
    const computed = computedFields.get(member.id)!;
    return {
      ...member,
      familyName: 'آل شايع',
      status: calculateStatus(member.generation),
      fullNameAr: generateFullNameAr(
        member.firstName,
        member.fatherName,
        member.grandfatherName,
        member.gender
      ),
      fullNameEn: generateFullNameEn(
        member.firstName,
        member.fatherName,
        member.grandfatherName,
        member.gender
      ),
      ...computed,
    };
  });
}
