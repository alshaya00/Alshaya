import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStatistics } from '@/lib/data';

export async function GET() {
  try {
    // Try to get statistics from database first
    const members = await prisma.familyMember.findMany();

    if (members.length > 0) {
      const totalMembers = members.length;
      const males = members.filter((m) => m.gender === 'Male').length;
      const females = members.filter((m) => m.gender === 'Female').length;
      const generations = Math.max(...members.map((m) => m.generation));

      const branches = [...new Set(members.map((m) => m.branch).filter(Boolean))];
      const branchCounts = branches.map((branch) => ({
        name: branch,
        count: members.filter((m) => m.branch === branch).length,
      }));

      const generationBreakdown = Array.from({ length: generations }, (_, i) => {
        const gen = i + 1;
        const genMembers = members.filter((m) => m.generation === gen);
        return {
          generation: gen,
          count: genMembers.length,
          males: genMembers.filter((m) => m.gender === 'Male').length,
          females: genMembers.filter((m) => m.gender === 'Female').length,
          percentage: Math.round((genMembers.length / totalMembers) * 100),
        };
      });

      return NextResponse.json({
        totalMembers,
        males,
        females,
        generations,
        branches: branchCounts,
        generationBreakdown,
      });
    }

    // Fallback to in-memory data if database is empty
    const stats = getStatistics();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Database error, falling back to in-memory data:', error);
    // Fallback to in-memory data if database query fails
    const stats = getStatistics();
    return NextResponse.json(stats);
  }
}
