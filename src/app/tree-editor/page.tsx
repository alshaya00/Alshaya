'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';
import {
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  Edit,
  Save,
  X,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Phone,
  Mail,
  History,
} from 'lucide-react';
import { familyMembers, buildFamilyTree } from '@/lib/data';
import { validateParentChange } from '@/lib/edit-utils';
import { FamilyMember, TreeNode } from '@/lib/types';

interface D3Node extends d3.HierarchyPointNode<TreeNode> {
  x0?: number;
  y0?: number;
}

interface DragState {
  isDragging: boolean;
  node: D3Node | null;
  startX: number;
  startY: number;
  validDropTargets: string[];
}

interface PendingChange {
  type: 'PARENT_CHANGE' | 'EDIT';
  memberId: string;
  memberName: string;
  oldParentId: string | null;
  newParentId: string | null;
  oldParentName: string | null;
  newParentName: string | null;
}

export default function TreeEditorPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    node: null,
    startX: 0,
    startY: 0,
    validDropTargets: []
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ nodeId: string; newParentId: string } | null>(null);

  // Tree data
  const treeData = useMemo(() => {
    const tree = buildFamilyTree();
    return tree[0] || null;
  }, []);

  // D3 references
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  // Colors
  const generationColors = [
    '#DC2626', '#EA580C', '#D97706', '#CA8A04',
    '#65A30D', '#16A34A', '#0D9488', '#0284C7',
  ];

  // Initialize D3 tree
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !treeData) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    gRef.current = g as unknown as d3.Selection<SVGGElement, unknown, null, undefined>;

    // Create tree layout
    const treeLayout = d3.tree<TreeNode>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right])
      .separation((a, b) => a.parent === b.parent ? 1.5 : 2);

    // Create hierarchy
    const root = d3.hierarchy(treeData, d => d.children) as D3Node;
    root.x0 = height / 2;
    root.y0 = 0;

    // Collapse nodes after depth 2
    root.descendants().forEach((d, i) => {
      if (d.depth > 2) {
        (d as any)._children = d.children;
        d.children = undefined;
      }
    });

    // Update function
    function update(source: D3Node) {
      const duration = 400;
      const nodes = root.descendants() as D3Node[];
      const links = root.links();

      // Compute new tree layout
      treeLayout(root);

      // Normalize for fixed-depth
      nodes.forEach(d => {
        d.y = d.depth * 180;
      });

      // Update nodes
      const node = g.selectAll<SVGGElement, D3Node>('g.node')
        .data(nodes, d => d.data.id);

      // Enter new nodes
      const nodeEnter = node.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', () => `translate(${source.y0 || 0},${source.x0 || 0})`)
        .attr('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          if (event.defaultPrevented) return;

          // Toggle children
          if ((d as any)._children) {
            d.children = (d as any)._children;
            (d as any)._children = undefined;
          } else if (d.children) {
            (d as any)._children = d.children;
            d.children = undefined;
          }

          setSelectedNode(d.data);
          update(d);
        });

      // Add circles
      nodeEnter.append('circle')
        .attr('r', 0)
        .attr('fill', d => generationColors[(d.data.generation - 1) % 8])
        .attr('stroke', d => d.data.gender === 'Male' ? '#3B82F6' : '#EC4899')
        .attr('stroke-width', 3);

      // Add labels
      nodeEnter.append('text')
        .attr('dy', '0.31em')
        .attr('x', d => (d.children || (d as any)._children) ? -15 : 15)
        .attr('text-anchor', d => (d.children || (d as any)._children) ? 'end' : 'start')
        .attr('font-size', '12px')
        .attr('fill', '#374151')
        .text(d => d.data.firstName)
        .clone(true).lower()
        .attr('stroke', 'white')
        .attr('stroke-width', 3);

      // Add status indicator
      nodeEnter.append('circle')
        .attr('r', 4)
        .attr('cx', 8)
        .attr('cy', -8)
        .attr('fill', d => d.data.status === 'Living' ? '#22C55E' : '#9CA3AF')
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

      // Add children count badge
      nodeEnter.filter(d => d.data.children && d.data.children.length > 0)
        .append('circle')
        .attr('r', 8)
        .attr('cx', -15)
        .attr('cy', 0)
        .attr('fill', '#6B7280')
        .attr('stroke', 'white');

      nodeEnter.filter(d => d.data.children && d.data.children.length > 0)
        .append('text')
        .attr('x', -15)
        .attr('y', 0)
        .attr('dy', '0.31em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .text(d => d.data.children?.length || 0);

      // Update + Enter
      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate.transition()
        .duration(duration)
        .attr('transform', d => `translate(${d.y},${d.x})`);

      nodeUpdate.select('circle')
        .attr('r', d => selectedNode?.id === d.data.id ? 14 : 10);

      // Exit nodes
      node.exit()
        .transition()
        .duration(duration)
        .attr('transform', () => `translate(${source.y},${source.x})`)
        .remove()
        .select('circle')
        .attr('r', 0);

      // Update links
      const link = g.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>('path.link')
        .data(links, d => d.target.data.id);

      // Enter new links
      const linkEnter = link.enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#CBD5E1')
        .attr('stroke-width', 2)
        .attr('d', () => {
          const o = { x: source.x0 || 0, y: source.y0 || 0 };
          return diagonal(o, o);
        });

      // Update + Enter
      linkEnter.merge(link)
        .transition()
        .duration(duration)
        .attr('d', d => diagonal(d.source, d.target));

      // Exit links
      link.exit()
        .transition()
        .duration(duration)
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      // Store positions
      nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Diagonal path generator
    function diagonal(s: { x: number; y: number }, t: { x: number; y: number }) {
      return `M ${s.y} ${s.x}
              C ${(s.y + t.y) / 2} ${s.x},
                ${(s.y + t.y) / 2} ${t.x},
                ${t.y} ${t.x}`;
    }

    // Initial update
    update(root);

    // Center the tree
    const initialTransform = d3.zoomIdentity
      .translate(100, height / 2)
      .scale(0.8);
    svg.call(zoom.transform, initialTransform);

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [treeData, selectedNode]);

  // Zoom controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7);
    }
  };

  const handleZoomReset = () => {
    if (svgRef.current && zoomRef.current) {
      const container = containerRef.current;
      if (container) {
        const transform = d3.zoomIdentity
          .translate(100, container.clientHeight / 2)
          .scale(0.8);
        d3.select(svgRef.current).transition().call(zoomRef.current.transform, transform);
      }
    }
  };

  // Handle parent change confirmation
  const confirmParentChange = useCallback(() => {
    if (!pendingDrop) return;

    const member = familyMembers.find(m => m.id === pendingDrop.nodeId);
    const oldParent = familyMembers.find(m => m.id === member?.fatherId);
    const newParent = familyMembers.find(m => m.id === pendingDrop.newParentId);

    if (member) {
      const change: PendingChange = {
        type: 'PARENT_CHANGE',
        memberId: member.id,
        memberName: member.fullNameAr || member.firstName,
        oldParentId: member.fatherId,
        newParentId: pendingDrop.newParentId,
        oldParentName: oldParent?.firstName || null,
        newParentName: newParent?.firstName || null
      };

      setPendingChanges(prev => [...prev, change]);
    }

    setShowConfirmDialog(false);
    setPendingDrop(null);
  }, [pendingDrop]);

  // Remove pending change
  const removePendingChange = (index: number) => {
    setPendingChanges(prev => prev.filter((_, i) => i !== index));
  };

  // Save all changes
  const saveChanges = async () => {
    if (pendingChanges.length === 0) return;

    // Save to localStorage
    const history = JSON.parse(localStorage.getItem('alshaye_tree_changes') || '[]');
    history.push({
      timestamp: new Date().toISOString(),
      changes: pendingChanges
    });
    localStorage.setItem('alshaye_tree_changes', JSON.stringify(history));

    // Clear pending
    setPendingChanges([]);
    setEditMode(false);
    alert('تم حفظ التغييرات بنجاح');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-l from-[#1E3A5F] to-[#2D5A87] text-white py-4 px-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/tree"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowRight className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">محرر الشجرة التفاعلي</h1>
              <p className="text-white/80 text-xs">Interactive Tree Editor with Drag & Drop</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Edit mode toggle */}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                editMode
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Edit className="w-4 h-4" />
              {editMode ? 'وضع التعديل' : 'وضع العرض'}
            </button>

            {pendingChanges.length > 0 && (
              <button
                onClick={saveChanges}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Save className="w-4 h-4" />
                حفظ ({pendingChanges.length})
              </button>
            )}

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white/10 rounded"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-2 hover:bg-white/10 rounded"
                title="إعادة تعيين"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white/10 rounded"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree canvas */}
        <div ref={containerRef} className="flex-1 relative">
          <svg ref={svgRef} className="w-full h-full" />

          {/* Instructions overlay */}
          {editMode && (
            <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800 max-w-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Move className="w-4 h-4" />
                وضع التعديل
              </div>
              <p>اسحب أي عضو وأفلته على عضو آخر لتغيير الأب</p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs">
            <div className="font-bold mb-2">دليل الألوان</div>
            <div className="grid grid-cols-4 gap-2">
              {generationColors.map((color, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>ج{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500" />
                <span>ذكر</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-pink-500" />
                <span>أنثى</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-white shadow-lg flex flex-col overflow-hidden">
            {/* Selected node details */}
            {selectedNode ? (
              <div className="flex-1 overflow-auto">
                <div className={`p-4 ${
                  selectedNode.gender === 'Male' ? 'bg-blue-50' : 'bg-pink-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">
                      {selectedNode.fullNameAr || selectedNode.firstName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      selectedNode.status === 'Living'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedNode.status === 'Living' ? 'حي' : 'متوفى'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className={`px-2 py-0.5 rounded ${
                      selectedNode.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
                    }`}>
                      {selectedNode.gender === 'Male' ? 'ذكر' : 'أنثى'}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded">
                      الجيل {selectedNode.generation}
                    </span>
                    <span className="text-gray-400">{selectedNode.id}</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Info section */}
                  <div>
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      معلومات شخصية
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedNode.birthYear && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">سنة الميلاد</span>
                          <span>{selectedNode.birthYear}</span>
                        </div>
                      )}
                      {selectedNode.occupation && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">المهنة</span>
                          <span>{selectedNode.occupation}</span>
                        </div>
                      )}
                      {selectedNode.branch && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">الفرع</span>
                          <span>{selectedNode.branch}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact section */}
                  {(selectedNode.phone || selectedNode.email || selectedNode.city) && (
                    <div>
                      <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        معلومات التواصل
                      </h4>
                      <div className="space-y-2 text-sm">
                        {selectedNode.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span dir="ltr">{selectedNode.phone}</span>
                          </div>
                        )}
                        {selectedNode.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span dir="ltr">{selectedNode.email}</span>
                          </div>
                        )}
                        {selectedNode.city && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">المدينة:</span>
                            <span>{selectedNode.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Family section */}
                  <div>
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      العائلة
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedNode.fatherName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">الأب</span>
                          <span>{selectedNode.fatherName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">الأبناء</span>
                        <span>{selectedNode.sonsCount} ذكور، {selectedNode.daughtersCount} إناث</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t space-y-2">
                    <Link
                      href={`/edit/${selectedNode.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87]"
                    >
                      <Edit className="w-4 h-4" />
                      تعديل العضو
                    </Link>
                    <Link
                      href={`/member/${selectedNode.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      عرض الملف الكامل
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8 text-gray-500">
                <div>
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>اضغط على أي عضو لعرض تفاصيله</p>
                </div>
              </div>
            )}

            {/* Pending changes */}
            {pendingChanges.length > 0 && (
              <div className="border-t bg-yellow-50 p-4">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  تغييرات معلقة ({pendingChanges.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {pendingChanges.map((change, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white p-2 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{change.memberName}</span>
                        <p className="text-xs text-gray-500">
                          {change.oldParentName || 'جذر'} → {change.newParentName || 'جذر'}
                        </p>
                      </div>
                      <button
                        onClick={() => removePendingChange(i)}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirmDialog && pendingDrop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-yellow-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">تأكيد تغيير الأب</h3>
            </div>
            <p className="text-gray-600 mb-6">
              هل تريد تغيير أب العضو <strong>{
                familyMembers.find(m => m.id === pendingDrop.nodeId)?.firstName
              }</strong> إلى <strong>{
                familyMembers.find(m => m.id === pendingDrop.newParentId)?.firstName
              }</strong>؟
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingDrop(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={confirmParentChange}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D5A87] flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
