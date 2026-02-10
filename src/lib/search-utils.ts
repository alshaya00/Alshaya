const STOP_WORDS = ['بن', 'بنت', 'bin', 'bint', 'ibn', 'al', 'ال', 'آل'];

export function normalizeForSearch(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآاٱ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/ک/g, 'ك')
    .replace(/عبد\s+ال/g, 'عبدال')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

type SearchableMember = {
  id: string;
  firstName: string;
  fatherName?: string | null;
  grandfatherName?: string | null;
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  branch?: string | null;
  generation?: number;
  city?: string | null;
  occupation?: string | null;
};

export function smartMemberSearch<T extends SearchableMember>(
  items: T[],
  query: string,
  options?: { limit?: number; includeLineageOnly?: boolean }
): SearchResult<T>[] {
  if (!query || !query.trim()) return [];

  const limit = options?.limit ?? 15;
  const normalizedQuery = normalizeForSearch(query);
  const allParts = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  const queryParts = allParts.filter(t => !STOP_WORDS.includes(t));

  if (queryParts.length === 0) return [];

  // ID search (P001 format)
  if (/^p?\d+$/i.test(query.trim())) {
    const upperQ = query.trim().toUpperCase();
    const cleanNum = upperQ.replace(/^P/, '');
    const searchNum = parseInt(cleanNum, 10);
    const match = items.find(m => {
      const mNum = parseInt(m.id.replace(/^P/i, ''), 10);
      return mNum === searchNum;
    });
    if (match) return [{ item: match, score: 200 }];
    return [];
  }

  const queryLower = query.toLowerCase();
  const isSingleWord = queryParts.length === 1;
  const results: SearchResult<T>[] = [];

  for (const m of items) {
    const nFirst = normalizeForSearch(m.firstName || '');
    const nFather = normalizeForSearch(m.fatherName || '');
    const nGrandfather = normalizeForSearch(m.grandfatherName || '');
    const nFullAr = normalizeForSearch(m.fullNameAr || '');
    const nFullEn = (m.fullNameEn || '').toLowerCase();
    const nBranch = normalizeForSearch(m.branch || '');

    let score = 0;

    if (isSingleWord) {
      // Single word search
      const primaryName = queryParts[0];
      
      // First priority: firstName matches
      if (nFirst === primaryName) {
        score = 100;
      } else if (nFirst.startsWith(primaryName)) {
        score = 80;
      } else if (nFirst.includes(primaryName)) {
        score = 50;
      }

      // Second priority: lineage-only matches (much lower score)
      if (score === 0) {
        if (nFather === primaryName || nGrandfather === primaryName || nFullAr.includes(primaryName)) {
          score = 12;
        }
      }
    } else {
      // Multi-word search: check if query parts appear in sequence in the lineage chain
      // Build the lineage chain: firstName -> fatherName -> grandfatherName -> rest from fullNameAr
      const lineageChain = [nFirst, nFather, nGrandfather];
      
      // Add remaining parts from fullNameAr
      const fullArParts = nFullAr.split(/\s+/).filter(p => p.length > 0);
      for (const part of fullArParts) {
        if (!lineageChain.includes(part)) {
          lineageChain.push(part);
        }
      }

      // Check if all query parts appear in sequence in the lineage chain
      let currentIndex = 0;
      let allMatched = true;

      for (const queryPart of queryParts) {
        let foundMatch = false;
        for (let i = currentIndex; i < lineageChain.length; i++) {
          if (lineageChain[i] === queryPart || lineageChain[i].includes(queryPart)) {
            foundMatch = true;
            currentIndex = i + 1;
            break;
          }
        }
        if (!foundMatch) {
          allMatched = false;
          break;
        }
      }

      if (allMatched) {
        // All query parts matched in sequence
        // Score based on where they matched in the chain
        score = 100 - (currentIndex * 5);
        
        // Bonus for exact matches at the beginning
        if (queryParts[0] === nFirst) {
          score = 100;
          if (queryParts.length > 1 && queryParts[1] === nFather) {
            score = 120;
          }
        }
      }
    }

    // English name bonus
    if (nFullEn && nFullEn.includes(queryLower)) {
      score += 20;
    }

    // Branch bonus
    if (nBranch) {
      for (const part of queryParts) {
        if (nBranch.includes(part)) {
          score += 10;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({ item: m, score });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return ((a.item.generation ?? 0) - (b.item.generation ?? 0));
  });

  return results.slice(0, limit);
}

export function smartMemberFilter<T extends SearchableMember>(
  items: T[],
  query: string,
  options?: { limit?: number }
): T[] {
  if (!query || query.trim().length < 2) return [];
  return smartMemberSearch(items, query, options).map(r => r.item);
}
