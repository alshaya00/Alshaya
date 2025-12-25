import { NextResponse } from 'next/server';
import { getAllMembersFromDb } from '@/lib/db';
import type { FamilyMember } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TreeNode {
  id: string;
  firstName: string;
  fullNameAr: string | null;
  gender: string;
  generation: number;
  birthYear: number | null;
  deathYear: number | null;
  status: string | null;
  sonsCount: number | null;
  daughtersCount: number | null;
  children: TreeNode[];
}

function buildTreeFromMembers(members: FamilyMember[]): TreeNode | null {
  if (members.length === 0) return null;

  const memberMap = new Map<string, TreeNode>();
  
  members.forEach(m => {
    memberMap.set(m.id, {
      id: m.id,
      firstName: m.firstName,
      fullNameAr: m.fullNameAr ?? null,
      gender: m.gender,
      generation: m.generation,
      birthYear: m.birthYear ?? null,
      deathYear: m.deathYear ?? null,
      status: m.status ?? null,
      sonsCount: m.sonsCount ?? null,
      daughtersCount: m.daughtersCount ?? null,
      children: [],
    });
  });

  let root: TreeNode | null = null;

  members.forEach(m => {
    const node = memberMap.get(m.id);
    if (!node) return;

    if (m.fatherId && memberMap.has(m.fatherId)) {
      const parent = memberMap.get(m.fatherId);
      parent?.children.push(node);
    } else if (m.generation === 1) {
      root = node;
    }
  });

  if (!root) {
    const gen1 = members.find(m => m.generation === 1);
    if (gen1) {
      root = memberMap.get(gen1.id) || null;
    }
  }

  return root;
}

export async function GET() {
  try {
    const members = await getAllMembersFromDb();
    const tree = buildTreeFromMembers(members);
    
    if (!tree) {
      return NextResponse.json({ error: 'No family tree data available' }, { status: 404 });
    }
    
    const response = NextResponse.json(tree);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Error building family tree:', error);
    return NextResponse.json({ error: 'Failed to build family tree' }, { status: 500 });
  }
}
