'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { buildFamilyTree, FamilyMember } from '@/lib/data';
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize } from 'lucide-react';
import Link from 'next/link';

type TreeNode = FamilyMember & { children?: TreeNode[] };

export default function TreePage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const treeData = buildFamilyTree();
    if (!treeData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 800;
    const margin = { top: 40, right: 150, bottom: 40, left: 150 };

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height].join(' '));

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tree layout - horizontal orientation
    const treeLayout = d3
      .tree<TreeNode>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right - 200]);

    const root = d3.hierarchy(treeData as TreeNode);
    const treeNodes = treeLayout(root);

    // Draw links (connections between nodes)
    g.selectAll('.link')
      .data(treeNodes.links())
      .enter()
      .append('path')
      .attr('class', 'tree-link')
      .attr('d', (d: d3.HierarchyPointLink<TreeNode>) => {
        return `M${d.source.y},${d.source.x}
                C${(d.source.y + d.target.y) / 2},${d.source.x}
                 ${(d.source.y + d.target.y) / 2},${d.target.x}
                 ${d.target.y},${d.target.x}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2);

    // Create node groups
    const nodes = g
      .selectAll('.node')
      .data(treeNodes.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: d3.HierarchyPointNode<TreeNode>) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d: d3.HierarchyPointNode<TreeNode>) => {
        setSelectedMember(d.data as FamilyMember);
      });

    // Draw node circles
    nodes
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d: d3.HierarchyPointNode<TreeNode>) =>
        d.data.gender === 'Male' ? '#DBEEF3' : '#F2DCDB'
      )
      .attr('stroke', (d: d3.HierarchyPointNode<TreeNode>) =>
        d.data.gender === 'Male' ? '#4472C4' : '#E91E63'
      )
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Add name text inside circle
    nodes
      .append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text((d: d3.HierarchyPointNode<TreeNode>) => d.data.firstName);

    // Add ID below circle
    nodes
      .append('text')
      .attr('dy', 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .text((d: d3.HierarchyPointNode<TreeNode>) => `(${d.data.id})`);

    // Add generation badge above circle
    nodes
      .append('text')
      .attr('dy', -40)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#888')
      .text((d: d3.HierarchyPointNode<TreeNode>) => `ج${d.data.generation}`);

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Store zoom for controls
    (svg.node() as any).__zoom = zoom;
    (svg.node() as any).__zoomG = g;
  }, []);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    const zoom = (svg.node() as any)?.__zoom;
    if (zoom) {
      svg.transition().call(zoom.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    const zoom = (svg.node() as any)?.__zoom;
    if (zoom) {
      svg.transition().call(zoom.scaleBy, 0.7);
    }
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    const zoom = (svg.node() as any)?.__zoom;
    if (zoom) {
      svg.transition().call(zoom.transform, d3.zoomIdentity.translate(150, 40));
    }
  };

  return (
    <div className="min-h-screen py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <span className="text-4xl">🌳</span>
            الشجرة التفاعلية
          </h1>
          <p className="text-gray-600 mt-2">Interactive Family Tree</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="تكبير"
            >
              <ZoomIn size={20} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="تصغير"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="إعادة تعيين"
            >
              <RotateCcw size={20} />
            </button>
            <span className="text-sm text-gray-500 mr-4">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></span>
              <span className="text-sm text-gray-600">ذكر</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-pink-100 border-2 border-pink-500"></span>
              <span className="text-sm text-gray-600">أنثى</span>
            </div>
          </div>
        </div>

        {/* Tree Container */}
        <div className="flex gap-4">
          <div
            ref={containerRef}
            className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200"
          >
            <svg ref={svgRef} className="w-full" style={{ minHeight: '800px' }}></svg>
          </div>

          {/* Member Details Panel */}
          {selectedMember && (
            <div className="w-80 bg-white rounded-2xl shadow-xl p-6 h-fit sticky top-24">
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>

              <div className="text-center mb-4">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl mb-3 ${
                    selectedMember.gender === 'Male'
                      ? 'bg-blue-100 border-4 border-blue-500'
                      : 'bg-pink-100 border-4 border-pink-500'
                  }`}
                >
                  {selectedMember.gender === 'Male' ? '👨' : '👩'}
                </div>
                <h3 className="text-xl font-bold text-gray-800">{selectedMember.firstName}</h3>
                <p className="text-sm text-gray-500">{selectedMember.id}</p>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">الاسم الكامل</p>
                  <p className="font-semibold">{selectedMember.fullNameAr}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">الجيل</p>
                    <p className="font-semibold">الجيل {selectedMember.generation}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">الفرع</p>
                    <p className="font-semibold">{selectedMember.branch}</p>
                  </div>
                </div>

                {selectedMember.birthYear && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">سنة الميلاد</p>
                    <p className="font-semibold">{selectedMember.birthYear}</p>
                  </div>
                )}

                {selectedMember.occupation && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">المهنة</p>
                    <p className="font-semibold">{selectedMember.occupation}</p>
                  </div>
                )}

                {selectedMember.city && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">المدينة</p>
                    <p className="font-semibold">{selectedMember.city}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">الأبناء</p>
                    <p className="font-bold text-blue-600 text-lg">{selectedMember.sonsCount}</p>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">البنات</p>
                    <p className="font-bold text-pink-600 text-lg">{selectedMember.daughtersCount}</p>
                  </div>
                </div>

                <Link
                  href={`/member/${selectedMember.id}`}
                  className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  عرض الملف الكامل
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-blue-800">
            💡 اسحب للتنقل • استخدم عجلة الفأرة للتكبير/التصغير • انقر على أي شخص لعرض تفاصيله
          </p>
        </div>
      </div>
    </div>
  );
}
