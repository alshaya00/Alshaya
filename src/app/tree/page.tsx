'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { buildFamilyTree, getAllMembers, FamilyMember } from '@/lib/data';
import {
  ZoomIn, ZoomOut, RotateCcw, Search,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import Link from 'next/link';

type TreeNode = FamilyMember & {
  children?: TreeNode[];
  _children?: TreeNode[];
  x0?: number;
  y0?: number;
};

export default function TreePage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const allMembers = getAllMembers();

  // Search functionality
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const results = allMembers.filter(m =>
        m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.fullNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 8);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allMembers]);

  const highlightMember = useCallback((id: string) => {
    setHighlightedId(id);
    setSearchTerm('');
    setSearchResults([]);
    setTimeout(() => setHighlightedId(null), 3000);
  }, []);

  useEffect(() => {
    const treeData = buildFamilyTree();
    if (!treeData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 700;
    const margin = { top: 60, right: 40, bottom: 40, left: 40 };

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Add gradient definitions
    const defs = svg.append('defs');

    // Male gradient
    const maleGradient = defs.append('linearGradient')
      .attr('id', 'maleGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    maleGradient.append('stop').attr('offset', '0%').attr('stop-color', '#60a5fa');
    maleGradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6');

    // Female gradient
    const femaleGradient = defs.append('linearGradient')
      .attr('id', 'femaleGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    femaleGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f472b6');
    femaleGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ec4899');

    // Drop shadow filter
    const filter = defs.append('filter')
      .attr('id', 'dropShadow')
      .attr('height', '130%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', 'rgba(0,0,0,0.2)');

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${margin.top})`);

    // Create tree layout - VERTICAL orientation
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([85, 100])
      .separation((a, b) => a.parent === b.parent ? 1.2 : 1.8);

    // Create hierarchy
    const root = d3.hierarchy(treeData as TreeNode);

    // Collapse nodes after depth 2
    root.descendants().forEach((d: any) => {
      if (d.depth >= 2 && d.children) {
        d._children = d.children;
        d.children = null;
      }
    });

    const update = (source: any) => {
      const treeNodes = treeLayout(root as any);
      const nodes = treeNodes.descendants();
      const links = treeNodes.links();
      const duration = 400;

      // Update links
      const link = g.selectAll<SVGPathElement, any>('.link')
        .data(links, (d: any) => d.target.data.id);

      const linkEnter = link.enter()
        .append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2)
        .attr('d', () => {
          const o = { x: source.x0 || 0, y: source.y0 || 0 };
          return `M${o.x},${o.y}L${o.x},${o.y}`;
        });

      link.merge(linkEnter)
        .transition()
        .duration(duration)
        .attr('d', (d: any) => {
          return `M${d.source.x},${d.source.y}
                  C${d.source.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${d.target.y}`;
        });

      link.exit()
        .transition()
        .duration(duration)
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return `M${o.x},${o.y}L${o.x},${o.y}`;
        })
        .remove();

      // Update nodes
      const node = g.selectAll<SVGGElement, any>('.node')
        .data(nodes, (d: any) => d.data.id);

      const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', () => `translate(${source.x0 || 0},${source.y0 || 0})`)
        .style('cursor', 'pointer')
        .on('click', (event: MouseEvent, d: any) => {
          event.stopPropagation();
          if (event.shiftKey || event.ctrlKey) {
            setSelectedMember(d.data as FamilyMember);
          } else {
            if (d.children) {
              d._children = d.children;
              d.children = null;
            } else if (d._children) {
              d.children = d._children;
              d._children = null;
            }
            update(d);
          }
        });

      // Node card background
      nodeEnter.append('rect')
        .attr('class', 'node-bg')
        .attr('x', -38)
        .attr('y', -28)
        .attr('width', 76)
        .attr('height', 56)
        .attr('rx', 10)
        .attr('fill', 'white')
        .attr('filter', 'url(#dropShadow)');

      // Colored header bar
      nodeEnter.append('rect')
        .attr('x', -38)
        .attr('y', -28)
        .attr('width', 76)
        .attr('height', 10)
        .attr('rx', 10)
        .attr('fill', (d: any) => d.data.gender === 'Male' ? 'url(#maleGradient)' : 'url(#femaleGradient)');

      nodeEnter.append('rect')
        .attr('x', -38)
        .attr('y', -22)
        .attr('width', 76)
        .attr('height', 6)
        .attr('fill', (d: any) => d.data.gender === 'Male' ? '#3b82f6' : '#ec4899');

      // Gender icon
      nodeEnter.append('text')
        .attr('x', 0)
        .attr('y', -2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .text((d: any) => d.data.gender === 'Male' ? '👨' : '👩');

      // Name
      nodeEnter.append('text')
        .attr('x', 0)
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1f2937')
        .text((d: any) => {
          const name = d.data.firstName;
          return name.length > 9 ? name.slice(0, 8) + '..' : name;
        });

      // Expand/collapse indicator
      nodeEnter.append('circle')
        .attr('class', 'toggle-circle')
        .attr('cx', 0)
        .attr('cy', 38)
        .attr('r', 12)
        .attr('fill', (d: any) => (d._children || d.children) ? '#10b981' : 'transparent')
        .attr('stroke', (d: any) => (d._children || d.children) ? '#10b981' : 'transparent');

      nodeEnter.append('text')
        .attr('class', 'toggle-text')
        .attr('x', 0)
        .attr('y', 42)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text((d: any) => {
          if (d._children) return '+' + d._children.length;
          if (d.children) return '−';
          return '';
        });

      // Generation badge
      nodeEnter.append('circle')
        .attr('cx', 30)
        .attr('cy', -20)
        .attr('r', 10)
        .attr('fill', (d: any) => {
          const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7'];
          return colors[(d.data.generation - 1) % colors.length];
        });

      nodeEnter.append('text')
        .attr('x', 30)
        .attr('y', -16)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text((d: any) => d.data.generation);

      // Merge and transition
      const nodeUpdate = node.merge(nodeEnter);

      nodeUpdate.transition()
        .duration(duration)
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

      // Update toggle indicators
      nodeUpdate.select('.toggle-circle')
        .attr('fill', (d: any) => (d._children || d.children) ? '#10b981' : 'transparent')
        .attr('stroke', (d: any) => (d._children || d.children) ? '#10b981' : 'transparent');

      nodeUpdate.select('.toggle-text')
        .text((d: any) => {
          if (d._children) return '+' + d._children.length;
          if (d.children) return '−';
          return '';
        });

      // Highlight effect
      nodeUpdate.select('.node-bg')
        .attr('stroke', (d: any) => d.data.id === highlightedId ? '#fbbf24' : 'transparent')
        .attr('stroke-width', (d: any) => d.data.id === highlightedId ? 4 : 0);

      // Exit
      node.exit()
        .transition()
        .duration(duration)
        .attr('transform', () => `translate(${source.x},${source.y})`)
        .remove();

      // Store positions
      nodes.forEach((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    // Initial render
    (root as any).x0 = 0;
    (root as any).y0 = 0;
    update(root);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', `translate(${event.transform.x + width / 2},${event.transform.y + margin.top}) scale(${event.transform.k})`);
      });

    svg.call(zoom);

    // Store references
    (svg.node() as any).__zoom = zoom;
    (svg.node() as any).__update = update;
    (svg.node() as any).__root = root;

  }, [highlightedId]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    const zoom = (svg.node() as any)?.__zoom;
    if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    const zoom = (svg.node() as any)?.__zoom;
    if (zoom) svg.transition().duration(300).call(zoom.scaleBy, 0.7);
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    const zoom = (svg.node() as any)?.__zoom;
    if (zoom) {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    }
  };

  const expandAll = () => {
    const svg = d3.select(svgRef.current);
    const root = (svg.node() as any)?.__root;
    const update = (svg.node() as any)?.__update;
    if (root && update) {
      root.descendants().forEach((d: any) => {
        if (d._children) {
          d.children = d._children;
          d._children = null;
        }
      });
      update(root);
    }
  };

  const collapseAll = () => {
    const svg = d3.select(svgRef.current);
    const root = (svg.node() as any)?.__root;
    const update = (svg.node() as any)?.__update;
    if (root && update) {
      root.descendants().forEach((d: any) => {
        if (d.depth >= 2 && d.children) {
          d._children = d.children;
          d.children = null;
        }
      });
      update(root);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <span className="text-3xl">🌳</span>
            الشجرة التفاعلية
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            انقر للتوسيع/الطي • Shift+انقر لعرض التفاصيل
          </p>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن شخص..."
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-500 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-60 overflow-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => highlightMember(m.id)}
                      className="w-full px-4 py-2 text-right hover:bg-gray-50 flex items-center gap-2 border-b last:border-0"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        m.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                      }`}>
                        {m.gender === 'Male' ? '👨' : '👩'}
                      </span>
                      <span className="font-medium">{m.firstName}</span>
                      <span className="text-xs text-gray-400">{m.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
              <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded-lg" title="تكبير">
                <ZoomIn size={18} />
              </button>
              <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded-lg" title="تصغير">
                <ZoomOut size={18} />
              </button>
              <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-lg" title="إعادة تعيين">
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Expand/Collapse */}
            <div className="flex items-center gap-1">
              <button
                onClick={expandAll}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
              >
                <ChevronDown size={16} />
                توسيع
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                <ChevronUp size={16} />
                طي
              </button>
            </div>

            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 mr-auto text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-500"></span> ذكر
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-pink-500"></span> أنثى
              </span>
            </div>
          </div>
        </div>

        {/* Tree Container */}
        <div className="flex gap-4">
          <div
            ref={containerRef}
            className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
            style={{ minHeight: '700px' }}
          >
            <svg ref={svgRef} className="w-full h-full"></svg>
          </div>

          {/* Member Details Sidebar */}
          {selectedMember && (
            <div className="w-72 bg-white rounded-2xl shadow-lg p-4 h-fit sticky top-20">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-3 left-3 p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-4">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-2 ${
                  selectedMember.gender === 'Male'
                    ? 'bg-blue-100 border-3 border-blue-500'
                    : 'bg-pink-100 border-3 border-pink-500'
                }`}>
                  {selectedMember.gender === 'Male' ? '👨' : '👩'}
                </div>
                <h3 className="text-lg font-bold">{selectedMember.firstName}</h3>
                <p className="text-xs text-gray-500">{selectedMember.id}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">الاسم الكامل</p>
                  <p className="font-medium text-sm">{selectedMember.fullNameAr}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">الجيل</p>
                    <p className="font-bold text-green-600">{selectedMember.generation}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">الفرع</p>
                    <p className="font-medium text-xs">{selectedMember.branch}</p>
                  </div>
                </div>

                {selectedMember.birthYear && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">سنة الميلاد</p>
                    <p className="font-medium">{selectedMember.birthYear}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{selectedMember.sonsCount}</p>
                    <p className="text-xs text-gray-500">أبناء</p>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-pink-600">{selectedMember.daughtersCount}</p>
                    <p className="text-xs text-gray-500">بنات</p>
                  </div>
                </div>

                <Link
                  href={`/member/${selectedMember.id}`}
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  عرض الملف الكامل
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Generation Legend */}
        <div className="mt-4 bg-white rounded-xl shadow-md p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">مفتاح الأجيال:</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((gen) => {
              const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
              return (
                <span key={gen} className={`px-3 py-1 rounded-full text-white text-sm font-medium ${colors[gen - 1]}`}>
                  الجيل {gen}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
