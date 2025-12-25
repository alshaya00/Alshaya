/**
 * Performance Testing Suite
 * Tests for response times, memory usage, and performance benchmarks
 */

import { performance } from 'perf_hooks';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  FAST: 50,      // < 50ms
  NORMAL: 200,   // < 200ms
  SLOW: 500,     // < 500ms
  CRITICAL: 1000 // < 1000ms
};

// Helper to measure execution time
function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

// Helper for async execution time
async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

describe('Performance Tests', () => {
  describe('Data Processing Performance', () => {
    it('should process small arrays quickly', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: `P${i.toString().padStart(3, '0')}`,
        name: `Member ${i}`,
        generation: Math.floor(i / 10) + 1,
      }));

      const { duration } = measureTime(() => {
        return data
          .filter(m => m.generation === 1)
          .map(m => m.name)
          .sort();
      });

      expect(duration).toBeLessThan(THRESHOLDS.FAST);
    });

    it('should process medium arrays within normal threshold', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: `P${i.toString().padStart(5, '0')}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        generation: Math.floor(i / 100) + 1,
        parentId: i > 0 ? `P${Math.floor((i - 1) / 2).toString().padStart(5, '0')}` : null,
      }));

      const { duration } = measureTime(() => {
        // Build parent-child relationships
        const childrenMap = new Map<string, string[]>();
        data.forEach(m => {
          if (m.parentId) {
            const children = childrenMap.get(m.parentId) || [];
            children.push(m.id);
            childrenMap.set(m.parentId, children);
          }
        });
        return childrenMap;
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });

    it('should handle large datasets within acceptable time', () => {
      const data = Array.from({ length: 10000 }, (_, i) => ({
        id: `P${i.toString().padStart(6, '0')}`,
        name: `Member ${i}`,
        generation: Math.floor(Math.log2(i + 1)) + 1,
        tags: ['tag1', 'tag2', 'tag3'],
      }));

      const { duration } = measureTime(() => {
        // Complex filtering and grouping
        const byGeneration = new Map<number, typeof data>();
        data.forEach(m => {
          const gen = byGeneration.get(m.generation) || [];
          gen.push(m);
          byGeneration.set(m.generation, gen);
        });
        return byGeneration;
      });

      expect(duration).toBeLessThan(THRESHOLDS.SLOW);
    });
  });

  describe('Search Performance', () => {
    const searchableData = Array.from({ length: 5000 }, (_, i) => ({
      id: `P${i}`,
      firstName: `محمد${i}`,
      lastName: `آل شايع`,
      fullName: `محمد${i} آل شايع`,
      bio: `عضو في العائلة رقم ${i}`,
    }));

    it('should perform simple search quickly', () => {
      const { duration } = measureTime(() => {
        return searchableData.filter(m => m.firstName.includes('محمد1'));
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });

    it('should perform regex search within threshold', () => {
      const { duration } = measureTime(() => {
        const pattern = /محمد\d{3}/;
        return searchableData.filter(m => pattern.test(m.firstName));
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });

    it('should perform multi-field search within threshold', () => {
      const query = 'محمد آل شايع';
      const terms = query.split(' ');

      const { duration } = measureTime(() => {
        return searchableData.filter(m => {
          const searchText = `${m.firstName} ${m.lastName} ${m.bio}`.toLowerCase();
          return terms.every(term => searchText.includes(term.toLowerCase()));
        });
      });

      expect(duration).toBeLessThan(THRESHOLDS.SLOW);
    });
  });

  describe('Tree Operations Performance', () => {
    // Build a tree structure
    interface TreeNode {
      id: string;
      name: string;
      children: TreeNode[];
    }

    function buildTree(depth: number, breadth: number): TreeNode {
      let nodeCount = 0;

      function createNode(currentDepth: number): TreeNode {
        const node: TreeNode = {
          id: `N${nodeCount++}`,
          name: `Node ${nodeCount}`,
          children: [],
        };

        if (currentDepth < depth) {
          for (let i = 0; i < breadth; i++) {
            node.children.push(createNode(currentDepth + 1));
          }
        }

        return node;
      }

      return createNode(0);
    }

    it('should traverse small tree quickly', () => {
      const tree = buildTree(4, 3); // ~40 nodes

      const { duration } = measureTime(() => {
        const nodes: string[] = [];
        function traverse(node: TreeNode) {
          nodes.push(node.id);
          node.children.forEach(traverse);
        }
        traverse(tree);
        return nodes;
      });

      expect(duration).toBeLessThan(THRESHOLDS.FAST);
    });

    it('should traverse medium tree within threshold', () => {
      const tree = buildTree(5, 4); // ~341 nodes

      const { duration } = measureTime(() => {
        const nodes: string[] = [];
        function traverse(node: TreeNode) {
          nodes.push(node.id);
          node.children.forEach(traverse);
        }
        traverse(tree);
        return nodes;
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });

    it('should find path in tree quickly', () => {
      const tree = buildTree(6, 3); // ~364 nodes

      const { duration } = measureTime(() => {
        function findPath(node: TreeNode, targetId: string, path: string[] = []): string[] | null {
          path.push(node.id);

          if (node.id === targetId) return path;

          for (const child of node.children) {
            const result = findPath(child, targetId, [...path]);
            if (result) return result;
          }

          return null;
        }

        return findPath(tree, 'N100');
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });

    it('should calculate tree statistics quickly', () => {
      const tree = buildTree(5, 4);

      const { duration } = measureTime(() => {
        function getStats(node: TreeNode): { depth: number; count: number; leafCount: number } {
          if (node.children.length === 0) {
            return { depth: 1, count: 1, leafCount: 1 };
          }

          const childStats = node.children.map(getStats);
          return {
            depth: 1 + Math.max(...childStats.map(s => s.depth)),
            count: 1 + childStats.reduce((sum, s) => sum + s.count, 0),
            leafCount: childStats.reduce((sum, s) => sum + s.leafCount, 0),
          };
        }

        return getStats(tree);
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });
  });

  describe('String Processing Performance', () => {
    it('should process Arabic text quickly', () => {
      const arabicText = 'محمد أحمد عبدالله محمود خالد سعود فهد '.repeat(1000);

      const { duration } = measureTime(() => {
        // Simulate name processing
        const names = arabicText.trim().split(' ').filter(Boolean);
        const uniqueNames = [...new Set(names)];
        return uniqueNames.sort((a, b) => a.localeCompare(b, 'ar'));
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });

    it('should format dates quickly', () => {
      const dates = Array.from({ length: 1000 }, (_, i) => {
        return new Date(Date.now() - i * 86400000);
      });

      const { duration } = measureTime(() => {
        return dates.map(d => {
          return d.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        });
      });

      expect(duration).toBeLessThan(THRESHOLDS.SLOW);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory in iterations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform operations that could potentially leak
      for (let i = 0; i < 100; i++) {
        const data = Array.from({ length: 1000 }, (_, j) => ({
          id: `${i}-${j}`,
          data: 'x'.repeat(100),
        }));
        // Process and discard
        data.filter(d => d.id.startsWith('50-'));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Allow some memory increase but not excessive
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent requests simulation', async () => {
      const simulateApiCall = async (id: number): Promise<{ id: number; data: string }> => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return { id, data: `Response ${id}` };
      };

      const { duration } = await measureTimeAsync(async () => {
        const promises = Array.from({ length: 50 }, (_, i) => simulateApiCall(i));
        return Promise.all(promises);
      });

      // Should complete much faster than serial execution (50 * 10ms = 500ms)
      expect(duration).toBeLessThan(THRESHOLDS.SLOW);
    });
  });

  describe('Serialization Performance', () => {
    it('should serialize large objects quickly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: `P${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        generation: i % 10,
        dates: {
          birth: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
        metadata: {
          tags: ['tag1', 'tag2'],
          notes: 'Some notes here',
        },
      }));

      const { duration } = measureTime(() => {
        const json = JSON.stringify(data);
        return JSON.parse(json);
      });

      expect(duration).toBeLessThan(THRESHOLDS.NORMAL);
    });
  });
});
