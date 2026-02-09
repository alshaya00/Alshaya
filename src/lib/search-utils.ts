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

  const primaryName = queryParts[0];
  const lineageNames = queryParts.slice(1);
  const queryLower = query.toLowerCase();

  const results: SearchResult<T>[] = [];

  for (const m of items) {
    const nFirst = normalizeForSearch(m.firstName || '');
    const nFather = normalizeForSearch(m.fatherName || '');
    const nGrandfather = normalizeForSearch(m.grandfatherName || '');
    const nFullAr = normalizeForSearch(m.fullNameAr || '');
    const nFullEn = (m.fullNameEn || '').toLowerCase();
    const nBranch = normalizeForSearch(m.branch || '');

    let score = 0;

    if (nFirst === primaryName) {
      score += 100;
    } else if (nFirst.startsWith(primaryName)) {
      score += 80;
    } else if (nFirst.includes(primaryName)) {
      score += 50;
    }

    if (lineageNames.length > 0) {
      let lineageMatched = 0;
      for (const part of lineageNames) {
        let partMatched = false;
        if (nFather === part) {
          score += 60;
          partMatched = true;
        } else if (nFather.includes(part)) {
          score += 40;
          partMatched = true;
        }
        if (nGrandfather === part) {
          score += 35;
          partMatched = true;
        } else if (nGrandfather.includes(part)) {
          score += 25;
          partMatched = true;
        }
        if (!partMatched && nFullAr.includes(part)) {
          score += 15;
          partMatched = true;
        }
        if (partMatched) lineageMatched++;
      }
      if (lineageMatched === 0) {
        score = Math.floor(score * 0.3);
      }
    }

    if (score === 0 && options?.includeLineageOnly !== false) {
      if (nFather === primaryName || nGrandfather === primaryName) {
        score = 5;
      } else if (nFullAr.includes(primaryName) || nFullEn.includes(primaryName) || m.id.toLowerCase().includes(primaryName)) {
        score = 3;
      }
    }

    if (nFullEn && nFullEn.includes(queryLower)) {
      score += 20;
    }

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
