import {
  getLineagePath,
  getGen2Ancestor,
  getGen3Ancestor,
  getAllGen2Branches,
  getAllGen3SubBranches,
  getMembersByGen2Branch,
  getMembersByGen3SubBranch,
  calculateLineageInfo,
  populateLineageInfo,
  getLineageBranchColor,
  getLineageBranchHexColor,
  formatLineageDisplay,
  getLineageBranchStats,
} from '@/lib/lineage-utils';

import type { FamilyMember } from '@/lib/types';

const createMember = (overrides: Partial<FamilyMember>): FamilyMember => ({
  id: '1',
  firstName: 'Test',
  fatherName: null,
  grandfatherName: null,
  greatGrandfatherName: null,
  familyName: 'آل شايع',
  fullNameAr: null,
  fullNameEn: null,
  gender: 'Male',
  birthYear: null,
  deathYear: null,
  status: 'Living',
  branch: null,
  generation: 1,
  fatherId: null,
  spouseIds: [],
  city: null,
  phone: null,
  email: null,
  occupation: null,
  biography: null,
  photoUrl: null,
  deletedAt: null,
  deletedBy: null,
  deletedReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  ...overrides,
});

describe('Lineage Utilities', () => {
  const mockFamilyTree: FamilyMember[] = [
    createMember({ id: '1', firstName: 'شايع', generation: 1, fatherId: null }),
    createMember({ id: '2', firstName: 'عبدالله', generation: 2, fatherId: '1' }),
    createMember({ id: '3', firstName: 'محمد', generation: 2, fatherId: '1' }),
    createMember({ id: '4', firstName: 'أحمد', generation: 3, fatherId: '2' }),
    createMember({ id: '5', firstName: 'خالد', generation: 3, fatherId: '2' }),
    createMember({ id: '6', firstName: 'سعد', generation: 3, fatherId: '3' }),
    createMember({ id: '7', firstName: 'فهد', generation: 4, fatherId: '4' }),
    createMember({ id: '8', firstName: 'عمر', generation: 4, fatherId: '4' }),
    createMember({ id: '9', firstName: 'يوسف', generation: 5, fatherId: '7' }),
  ];

  describe('getLineagePath', () => {
    it('should return empty path for root member (Gen 1)', () => {
      const path = getLineagePath('1', mockFamilyTree);
      expect(path).toEqual([]);
    });

    it('should return path with one ancestor for Gen 2', () => {
      const path = getLineagePath('2', mockFamilyTree);
      expect(path).toEqual(['1']);
    });

    it('should return full path for deep member', () => {
      const path = getLineagePath('9', mockFamilyTree);
      expect(path).toEqual(['1', '2', '4', '7']);
    });

    it('should return path for Gen 3 member', () => {
      const path = getLineagePath('4', mockFamilyTree);
      expect(path).toEqual(['1', '2']);
    });

    it('should return empty path for non-existent member', () => {
      const path = getLineagePath('999', mockFamilyTree);
      expect(path).toEqual([]);
    });

    it('should handle empty family tree', () => {
      const path = getLineagePath('1', []);
      expect(path).toEqual([]);
    });
  });

  describe('getGen2Ancestor', () => {
    it('should return null for Gen 1 member', () => {
      const ancestor = getGen2Ancestor('1', mockFamilyTree);
      expect(ancestor).toBeNull();
    });

    it('should return self for Gen 2 member', () => {
      const ancestor = getGen2Ancestor('2', mockFamilyTree);
      expect(ancestor?.id).toBe('2');
      expect(ancestor?.firstName).toBe('عبدالله');
    });

    it('should return correct Gen 2 ancestor for Gen 3 member', () => {
      const ancestor = getGen2Ancestor('4', mockFamilyTree);
      expect(ancestor?.id).toBe('2');
    });

    it('should return correct Gen 2 ancestor for deep member', () => {
      const ancestor = getGen2Ancestor('9', mockFamilyTree);
      expect(ancestor?.id).toBe('2');
      expect(ancestor?.firstName).toBe('عبدالله');
    });

    it('should return different Gen 2 ancestors for different branches', () => {
      const ancestorBranch1 = getGen2Ancestor('4', mockFamilyTree);
      const ancestorBranch2 = getGen2Ancestor('6', mockFamilyTree);
      expect(ancestorBranch1?.id).toBe('2');
      expect(ancestorBranch2?.id).toBe('3');
    });

    it('should return null for non-existent member', () => {
      const ancestor = getGen2Ancestor('999', mockFamilyTree);
      expect(ancestor).toBeNull();
    });
  });

  describe('getGen3Ancestor', () => {
    it('should return null for Gen 1 member', () => {
      const ancestor = getGen3Ancestor('1', mockFamilyTree);
      expect(ancestor).toBeNull();
    });

    it('should return null for Gen 2 member', () => {
      const ancestor = getGen3Ancestor('2', mockFamilyTree);
      expect(ancestor).toBeNull();
    });

    it('should return self for Gen 3 member', () => {
      const ancestor = getGen3Ancestor('4', mockFamilyTree);
      expect(ancestor?.id).toBe('4');
      expect(ancestor?.firstName).toBe('أحمد');
    });

    it('should return correct Gen 3 ancestor for Gen 4 member', () => {
      const ancestor = getGen3Ancestor('7', mockFamilyTree);
      expect(ancestor?.id).toBe('4');
    });

    it('should return correct Gen 3 ancestor for deep member', () => {
      const ancestor = getGen3Ancestor('9', mockFamilyTree);
      expect(ancestor?.id).toBe('4');
      expect(ancestor?.firstName).toBe('أحمد');
    });

    it('should return null for non-existent member', () => {
      const ancestor = getGen3Ancestor('999', mockFamilyTree);
      expect(ancestor).toBeNull();
    });
  });

  describe('getAllGen2Branches', () => {
    it('should return all Gen 2 members', () => {
      const branches = getAllGen2Branches(mockFamilyTree);
      expect(branches).toHaveLength(2);
      expect(branches.map(b => b.id)).toEqual(['2', '3']);
    });

    it('should return empty array for empty tree', () => {
      const branches = getAllGen2Branches([]);
      expect(branches).toHaveLength(0);
    });

    it('should return empty array if no Gen 2 members', () => {
      const tree = [createMember({ id: '1', generation: 1 })];
      const branches = getAllGen2Branches(tree);
      expect(branches).toHaveLength(0);
    });
  });

  describe('getAllGen3SubBranches', () => {
    it('should return all Gen 3 members', () => {
      const subBranches = getAllGen3SubBranches(mockFamilyTree);
      expect(subBranches).toHaveLength(3);
      expect(subBranches.map(b => b.id)).toEqual(['4', '5', '6']);
    });

    it('should return empty array for empty tree', () => {
      const subBranches = getAllGen3SubBranches([]);
      expect(subBranches).toHaveLength(0);
    });
  });

  describe('getMembersByGen2Branch', () => {
    it('should return all members in a branch including the branch head', () => {
      const members = getMembersByGen2Branch('2', mockFamilyTree);
      expect(members.map(m => m.id)).toEqual(['2', '4', '5', '7', '8', '9']);
    });

    it('should return members from another branch', () => {
      const members = getMembersByGen2Branch('3', mockFamilyTree);
      expect(members.map(m => m.id)).toEqual(['3', '6']);
    });

    it('should return empty for non-existent branch', () => {
      const members = getMembersByGen2Branch('999', mockFamilyTree);
      expect(members).toHaveLength(0);
    });
  });

  describe('getMembersByGen3SubBranch', () => {
    it('should return all members in a sub-branch', () => {
      const members = getMembersByGen3SubBranch('4', mockFamilyTree);
      expect(members.map(m => m.id)).toEqual(['4', '7', '8', '9']);
    });

    it('should return only the sub-branch head if no descendants', () => {
      const members = getMembersByGen3SubBranch('5', mockFamilyTree);
      expect(members.map(m => m.id)).toEqual(['5']);
    });

    it('should return empty for non-existent sub-branch', () => {
      const members = getMembersByGen3SubBranch('999', mockFamilyTree);
      expect(members).toHaveLength(0);
    });
  });

  describe('calculateLineageInfo', () => {
    it('should calculate lineage info for Gen 1', () => {
      const info = calculateLineageInfo('1', mockFamilyTree);
      expect(info.lineageBranchId).toBeNull();
      expect(info.lineageBranchName).toBeNull();
      expect(info.subBranchId).toBeNull();
      expect(info.subBranchName).toBeNull();
      expect(info.lineagePath).toEqual([]);
    });

    it('should calculate lineage info for Gen 2', () => {
      const info = calculateLineageInfo('2', mockFamilyTree);
      expect(info.lineageBranchId).toBe('2');
      expect(info.lineageBranchName).toBe('عبدالله');
      expect(info.subBranchId).toBeNull();
      expect(info.lineagePath).toEqual(['1']);
    });

    it('should calculate lineage info for Gen 3', () => {
      const info = calculateLineageInfo('4', mockFamilyTree);
      expect(info.lineageBranchId).toBe('2');
      expect(info.lineageBranchName).toBe('عبدالله');
      expect(info.subBranchId).toBe('4');
      expect(info.subBranchName).toBe('أحمد');
    });

    it('should calculate lineage info for deep member', () => {
      const info = calculateLineageInfo('9', mockFamilyTree);
      expect(info.lineageBranchId).toBe('2');
      expect(info.lineageBranchName).toBe('عبدالله');
      expect(info.subBranchId).toBe('4');
      expect(info.subBranchName).toBe('أحمد');
      expect(info.lineagePath).toEqual(['1', '2', '4', '7']);
    });
  });

  describe('populateLineageInfo', () => {
    it('should add lineage info to all members', () => {
      const populated = populateLineageInfo(mockFamilyTree);
      expect(populated).toHaveLength(mockFamilyTree.length);
      
      const deepMember = populated.find(m => m.id === '9');
      expect(deepMember?.lineageBranchId).toBe('2');
      expect(deepMember?.lineageBranchName).toBe('عبدالله');
      expect(deepMember?.subBranchId).toBe('4');
    });

    it('should handle empty array', () => {
      const populated = populateLineageInfo([]);
      expect(populated).toHaveLength(0);
    });

    it('should preserve original member data', () => {
      const populated = populateLineageInfo(mockFamilyTree);
      const member = populated.find(m => m.id === '2');
      expect(member?.firstName).toBe('عبدالله');
      expect(member?.gender).toBe('Male');
    });
  });

  describe('getLineageBranchColor', () => {
    const gen2Branches = getAllGen2Branches(mockFamilyTree);

    it('should return gray for null branch', () => {
      const color = getLineageBranchColor(null, gen2Branches);
      expect(color).toBe('bg-gray-500');
    });

    it('should return different colors for different branches', () => {
      const color1 = getLineageBranchColor('2', gen2Branches);
      const color2 = getLineageBranchColor('3', gen2Branches);
      expect(color1).not.toBe(color2);
      expect(color1).toMatch(/^bg-\w+-500$/);
    });

    it('should return gray for non-existent branch', () => {
      const color = getLineageBranchColor('999', gen2Branches);
      expect(color).toBe('bg-gray-500');
    });

    it('should cycle colors for many branches', () => {
      const manyBranches = Array.from({ length: 20 }, (_, i) => 
        createMember({ id: String(i + 100), generation: 2 })
      );
      const color = getLineageBranchColor('116', manyBranches);
      expect(color).toMatch(/^bg-\w+-500$/);
    });
  });

  describe('getLineageBranchHexColor', () => {
    const gen2Branches = getAllGen2Branches(mockFamilyTree);

    it('should return gray hex for null branch', () => {
      const color = getLineageBranchHexColor(null, gen2Branches);
      expect(color).toBe('#6b7280');
    });

    it('should return valid hex colors', () => {
      const color = getLineageBranchHexColor('2', gen2Branches);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should return gray for non-existent branch', () => {
      const color = getLineageBranchHexColor('999', gen2Branches);
      expect(color).toBe('#6b7280');
    });
  });

  describe('formatLineageDisplay', () => {
    it('should display root for Gen 1', () => {
      const member = createMember({ id: '1', generation: 1, lineageBranchName: null });
      const display = formatLineageDisplay(member);
      expect(display).toBe('الجذر الأصلي');
    });

    it('should display branch for Gen 2', () => {
      const member = createMember({ 
        id: '2', 
        generation: 2, 
        lineageBranchName: 'عبدالله',
        subBranchName: null,
      });
      const display = formatLineageDisplay(member);
      expect(display).toBe('فرع عبدالله');
    });

    it('should display branch with sub-branch for Gen 4+', () => {
      const member = createMember({ 
        id: '7', 
        generation: 4, 
        lineageBranchName: 'عبدالله',
        subBranchName: 'أحمد',
      });
      const display = formatLineageDisplay(member);
      expect(display).toBe('فرع عبدالله - ذرية أحمد');
    });

    it('should not include sub-branch for Gen 3 or less', () => {
      const member = createMember({ 
        id: '4', 
        generation: 3, 
        lineageBranchName: 'عبدالله',
        subBranchName: 'أحمد',
      });
      const display = formatLineageDisplay(member);
      expect(display).toBe('فرع عبدالله');
    });

    it('should respect includeSubBranch parameter', () => {
      const member = createMember({ 
        id: '7', 
        generation: 4, 
        lineageBranchName: 'عبدالله',
        subBranchName: 'أحمد',
      });
      const display = formatLineageDisplay(member, false);
      expect(display).toBe('فرع عبدالله');
    });

    it('should handle member with no lineage info', () => {
      const member = createMember({ 
        id: '99', 
        generation: 5, 
        lineageBranchName: null,
        subBranchName: null,
      });
      const display = formatLineageDisplay(member);
      expect(display).toBe('غير محدد');
    });
  });

  describe('getLineageBranchStats', () => {
    it('should return stats for all Gen 2 branches', () => {
      const stats = getLineageBranchStats(mockFamilyTree);
      expect(stats.size).toBe(2);
    });

    it('should count members correctly', () => {
      const stats = getLineageBranchStats(mockFamilyTree);
      const branch2Stats = stats.get('2');
      expect(branch2Stats?.name).toBe('عبدالله');
      expect(branch2Stats?.count).toBe(6);
    });

    it('should count living members', () => {
      const stats = getLineageBranchStats(mockFamilyTree);
      const branch2Stats = stats.get('2');
      expect(branch2Stats?.livingCount).toBe(6);
    });

    it('should handle deceased members', () => {
      const treeWithDeceased = [
        ...mockFamilyTree.slice(0, -1),
        createMember({ id: '9', firstName: 'يوسف', generation: 5, fatherId: '7', status: 'Deceased' }),
      ];
      const stats = getLineageBranchStats(treeWithDeceased);
      const branch2Stats = stats.get('2');
      expect(branch2Stats?.count).toBe(6);
      expect(branch2Stats?.livingCount).toBe(5);
    });

    it('should return empty map for empty tree', () => {
      const stats = getLineageBranchStats([]);
      expect(stats.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single member tree', () => {
      const singleMember = [createMember({ id: '1', generation: 1 })];
      expect(getLineagePath('1', singleMember)).toEqual([]);
      expect(getGen2Ancestor('1', singleMember)).toBeNull();
      expect(getAllGen2Branches(singleMember)).toHaveLength(0);
    });

    it('should handle tree without Gen 1', () => {
      const noRootTree = [
        createMember({ id: '2', generation: 2, fatherId: null }),
        createMember({ id: '3', generation: 3, fatherId: '2' }),
      ];
      expect(getGen2Ancestor('3', noRootTree)?.id).toBe('2');
    });

    it('should handle Arabic member names correctly', () => {
      const arabicTree = [
        createMember({ id: '1', firstName: 'عبدالرحمن بن محمد', generation: 2 }),
      ];
      const branches = getAllGen2Branches(arabicTree);
      expect(branches[0].firstName).toBe('عبدالرحمن بن محمد');
    });

    it('should handle members with special characters in names', () => {
      const info = calculateLineageInfo('2', mockFamilyTree);
      expect(info.lineageBranchName).toBe('عبدالله');
    });
  });
});
