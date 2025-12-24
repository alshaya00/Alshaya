'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '@/lib/types';
import { ZoomIn, ZoomOut, Maximize2, Home, UserPlus, Check } from 'lucide-react';
import { generationColors } from '@/config/theme';

interface TreeNode extends FamilyMember {
  children?: TreeNode[];
  isNewMember?: boolean;
  isTemporary?: boolean;
}

interface AddMemberGraphProps {
  members: FamilyMember[];
  selectedFatherId: string | null;
  onSelectFather: (member: FamilyMember | null) => void;
  newMemberPreview?: {
    firstName: string;
    gender: 'Male' | 'Female';
  } | null;
}

interface D3TreeNode {
  x: number;
  y: number;
  data: TreeNode;
  parent: D3TreeNode | null;
  children?: D3TreeNode[];
}

// Use colors from centralized theme config
const GENERATION_COLORS = generationColors;

export default function AddMemberGraph({
  members,
  selectedFatherId,
  onSelectFather,
  newMemberPreview
}: AddMemberGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [currentZoom, setCurrentZoom] = useState(0.5);
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Build tree structure with optional new member preview
  const treeData = useMemo(() => {
    const memberMap = new Map<string, TreeNode>();

    members.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    // Add new member preview if we have one and a selected father
    if (newMemberPreview && selectedFatherId && newMemberPreview.firstName) {
      const selectedFather = memberMap.get(selectedFatherId);
      if (selectedFather) {
        const connector = newMemberPreview.gender === 'Male' ? 'بن' : 'بنت';
        const fullNameAr = `${newMemberPreview.firstName} ${connector} ${selectedFather.firstName} آل شايع`;

        const newMemberNode: TreeNode = {
          id: 'NEW_MEMBER',
          firstName: newMemberPreview.firstName || 'عضو جديد',
          fatherName: selectedFather.firstName,
          grandfatherName: selectedFather.fatherName || null,
          greatGrandfatherName: selectedFather.grandfatherName || null,
          familyName: 'آل شايع',
          fatherId: selectedFatherId,
          gender: newMemberPreview.gender,
          generation: selectedFather.generation + 1,
          branch: selectedFather.branch,
          sonsCount: 0,
          daughtersCount: 0,
          status: 'Living',
          birthYear: null,
          fullNameAr: fullNameAr,
          fullNameEn: null,
          phone: null,
          city: null,
          photoUrl: null,
          biography: null,
          occupation: null,
          email: null,
          isNewMember: true,
          isTemporary: true,
          children: []
        };
        memberMap.set('NEW_MEMBER', newMemberNode);
      }
    }

    let root: TreeNode | null = null;

    memberMap.forEach(node => {
      if (node.fatherId && memberMap.has(node.fatherId)) {
        const parent = memberMap.get(node.fatherId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else if (!node.fatherId) {
        root = node;
      }
    });

    // Sort children by birth year, put new member last
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.isNewMember) return 1;
          if (b.isNewMember) return -1;
          return (a.birthYear || 0) - (b.birthYear || 0);
        });
        node.children.forEach(sortChildren);
      }
    };

    if (root) sortChildren(root);
    return root;
  }, [members, selectedFatherId, newMemberPreview]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 600), height: Math.max(height, 400) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // D3 tree layout
  const { nodes, links } = useMemo(() => {
    if (!treeData) return { nodes: [], links: [] };

    const hierarchy = d3.hierarchy<TreeNode>(treeData);
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([160, 180])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.6));

    const root = treeLayout(hierarchy);
    const nodes = root.descendants() as unknown as D3TreeNode[];
    const links = root.links() as unknown as { source: D3TreeNode; target: D3TreeNode }[];

    return { nodes, links };
  }, [treeData]);

  // Initialize D3 zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setCurrentZoom(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Set initial transform - center the tree
    const initialTransform = d3.zoomIdentity
      .translate(dimensions.width / 2, 80)
      .scale(0.45);

    svg.call(zoom.transform, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, [dimensions.width, dimensions.height]);

  // Zoom to selected father when changed
  useEffect(() => {
    if (!selectedFatherId || !svgRef.current || !zoomRef.current) return;

    const selectedNode = nodes.find(n => n.data.id === selectedFatherId);
    if (!selectedNode) return;

    const svg = d3.select(svgRef.current);
    const targetTransform = d3.zoomIdentity
      .translate(dimensions.width / 2 - selectedNode.x * 0.6, dimensions.height / 3 - selectedNode.y * 0.6)
      .scale(0.6);

    svg.transition().duration(500).call(zoomRef.current.transform, targetTransform);
  }, [selectedFatherId, nodes, dimensions]);

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }, []);

  const handleResetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const resetTransform = d3.zoomIdentity
      .translate(dimensions.width / 2, 80)
      .scale(0.45);
    svg.transition().duration(500).call(zoomRef.current.transform, resetTransform);
  }, [dimensions.width]);

  const handleFitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - 80);
      maxX = Math.max(maxX, node.x + 80);
      minY = Math.min(minY, node.y - 50);
      maxY = Math.max(maxY, node.y + 50);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;
    const scale = Math.min(
      (dimensions.width - 100) / treeWidth,
      (dimensions.height - 150) / treeHeight,
      1
    ) * 0.85;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const svg = d3.select(svgRef.current);
    const fitTransform = d3.zoomIdentity
      .translate(dimensions.width / 2 - centerX * scale, dimensions.height / 2 - centerY * scale)
      .scale(scale);

    svg.transition().duration(500).call(zoomRef.current.transform, fitTransform);
  }, [dimensions, nodes]);

  // Handle node click - only allow selecting male members as fathers
  const handleNodeClick = (node: TreeNode) => {
    if (node.isNewMember) return; // Can't select the preview node

    if (node.gender === 'Male') {
      if (selectedFatherId === node.id) {
        onSelectFather(null); // Deselect if already selected
      } else {
        onSelectFather(node);
      }
    }
  };

  // Generate orthogonal path for links
  const generateLinkPath = (source: D3TreeNode, target: D3TreeNode) => {
    const sourceY = source.y + 50;
    const targetY = target.y - 50;
    const midY = (sourceY + targetY) / 2;

    return `M ${source.x} ${sourceY}
            L ${source.x} ${midY}
            L ${target.x} ${midY}
            L ${target.x} ${targetY}`;
  };

  const getGenColors = (gen: number) => {
    return GENERATION_COLORS[gen as keyof typeof GENERATION_COLORS] || GENERATION_COLORS[8];
  };

  return (
    <div ref={containerRef} className="relative w-full h-[550px] bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-2">
        <button
          onClick={handleZoomIn}
          className="p-2.5 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="تكبير"
        >
          <ZoomIn size={20} className="text-gray-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2.5 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="تصغير"
        >
          <ZoomOut size={20} className="text-gray-600" />
        </button>
        <div className="w-full h-px bg-gray-200" />
        <button
          onClick={handleResetView}
          className="p-2.5 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="إعادة ضبط"
        >
          <Home size={20} className="text-gray-600" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2.5 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="ملائمة الشاشة"
        >
          <Maximize2 size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border text-sm font-medium text-gray-700">
        {Math.round(currentZoom * 100)}%
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {/* Gradient Definitions */}
        <defs>
          {Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
            <linearGradient key={gen} id={`add-gen-gradient-${gen}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          ))}
          <linearGradient id="add-male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="add-female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="add-new-member-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="add-card-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.1" />
          </filter>
          <filter id="add-card-shadow-hover" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000" floodOpacity="0.15" />
          </filter>
          <filter id="add-selected-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="#22c55e" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="add-new-member-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor="#10b981" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Transform Group - controlled by D3 zoom */}
        <g ref={gRef}>
          {/* Links */}
          <g className="links">
            {links.map((link, i) => {
              const genColor = getGenColors(link.target.data.generation);
              const isNewMemberLink = link.target.data.isNewMember;

              return (
                <g key={i}>
                  {/* Shadow/glow line for depth */}
                  <path
                    d={generateLinkPath(link.source, link.target)}
                    fill="none"
                    stroke={isNewMemberLink ? '#86efac' : genColor.secondary}
                    strokeWidth={isNewMemberLink ? 10 : 8}
                    strokeOpacity={isNewMemberLink ? 0.6 : 0.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isNewMemberLink ? '8 4' : 'none'}
                  />
                  {/* Main visible line */}
                  <path
                    d={generateLinkPath(link.source, link.target)}
                    fill="none"
                    stroke={isNewMemberLink ? '#22c55e' : genColor.primary}
                    strokeWidth={isNewMemberLink ? 4 : 3}
                    strokeOpacity={isNewMemberLink ? 1 : 0.85}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isNewMemberLink ? '8 4' : 'none'}
                    className={isNewMemberLink ? 'animate-pulse' : ''}
                  />
                </g>
              );
            })}
          </g>

          {/* Link connection dots */}
          <g className="link-dots">
            {links.map((link, i) => (
              <g key={i}>
                <circle
                  cx={link.source.x}
                  cy={link.source.y + 50}
                  r={5}
                  fill={getGenColors(link.source.data.generation).primary}
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cx={link.target.x}
                  cy={link.target.y - 50}
                  r={5}
                  fill={link.target.data.isNewMember ? '#22c55e' : getGenColors(link.target.data.generation).primary}
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const isSelected = node.data.id === selectedFatherId;
              const isHovered = hoveredNode?.id === node.data.id;
              const isMale = node.data.gender === 'Male';
              const isNewMember = node.data.isNewMember;
              const isSelectable = isMale && !isNewMember;

              return (
                <g
                  key={node.data.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={isSelectable ? 'cursor-pointer' : isNewMember ? 'cursor-default' : 'cursor-not-allowed'}
                  style={{ transition: 'transform 0.2s ease-out' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(node.data);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredNode(node.data);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Selection/highlight ring */}
                  {(isSelected || isNewMember) && (
                    <rect
                      x={-72}
                      y={-50}
                      width={144}
                      height={100}
                      rx={18}
                      fill="none"
                      stroke={isNewMember ? '#10b981' : '#22c55e'}
                      strokeWidth={isNewMember ? 3 : 4}
                      filter={isNewMember ? 'url(#add-new-member-glow)' : 'url(#add-selected-glow)'}
                      className="animate-pulse"
                    />
                  )}

                  {/* Card background */}
                  <rect
                    x={-65}
                    y={-42}
                    width={130}
                    height={84}
                    rx={14}
                    fill={isNewMember ? '#ecfdf5' : 'white'}
                    filter={isHovered || isSelected ? 'url(#add-card-shadow-hover)' : 'url(#add-card-shadow)'}
                    stroke={isNewMember ? '#34d399' : isSelected ? '#22c55e' : isHovered && isSelectable ? '#86efac' : '#e5e7eb'}
                    strokeWidth={isNewMember ? 2 : isSelected ? 3 : isHovered && isSelectable ? 2 : 1}
                    strokeDasharray={isNewMember ? '4 2' : 'none'}
                  />

                  {/* Generation color accent bar */}
                  <rect
                    x={-65}
                    y={-42}
                    width={130}
                    height={5}
                    fill={isNewMember ? 'url(#add-new-member-gradient)' : `url(#add-gen-gradient-${node.data.generation})`}
                    style={{ clipPath: 'inset(0 0 0 0 round 14px 14px 0 0)' }}
                  />

                  {/* Avatar circle */}
                  <circle
                    cx={0}
                    cy={-12}
                    r={20}
                    fill={isNewMember ? 'url(#add-new-member-gradient)' : isMale ? 'url(#add-male-gradient)' : 'url(#add-female-gradient)'}
                    stroke="white"
                    strokeWidth={3}
                  />

                  {/* Avatar icon */}
                  <text
                    x={0}
                    y={-7}
                    textAnchor="middle"
                    fontSize={isNewMember ? 14 : 16}
                    fill="white"
                  >
                    {isNewMember ? '+' : isMale ? '♂' : '♀'}
                  </text>

                  {/* Name */}
                  <text
                    x={0}
                    y={18}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="600"
                    fill={isNewMember ? '#059669' : '#1f2937'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {isNewMember ? (node.data.firstName || 'عضو جديد') : node.data.firstName}
                  </text>

                  {/* ID & Generation badge */}
                  <g transform="translate(0, 32)">
                    {!isNewMember && (
                      <text
                        x={-22}
                        y={0}
                        textAnchor="middle"
                        fontSize={8}
                        fill="#9ca3af"
                      >
                        {node.data.id}
                      </text>
                    )}

                    <rect
                      x={isNewMember ? -14 : 8}
                      y={-9}
                      width={isNewMember ? 36 : 28}
                      height={14}
                      rx={7}
                      fill={isNewMember ? 'url(#add-new-member-gradient)' : `url(#add-gen-gradient-${node.data.generation})`}
                    />
                    <text
                      x={isNewMember ? 4 : 22}
                      y={2}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight="bold"
                      fill="white"
                    >
                      {isNewMember ? 'جديد' : `ج${node.data.generation}`}
                    </text>
                  </g>

                  {/* Selected indicator */}
                  {isSelected && (
                    <g transform="translate(50, -32)">
                      <circle
                        cx={0}
                        cy={0}
                        r={12}
                        fill="#22c55e"
                        stroke="white"
                        strokeWidth={2}
                      />
                      <Check x={-6} y={-6} size={12} color="white" strokeWidth={3} />
                    </g>
                  )}

                  {/* Children indicator (only for existing members) */}
                  {!isNewMember && (node.data.sonsCount > 0 || node.data.daughtersCount > 0) && !isSelected && (
                    <g transform="translate(50, -32)">
                      <circle
                        cx={0}
                        cy={0}
                        r={10}
                        fill={isMale ? '#dbeafe' : '#fce7f3'}
                        stroke={isMale ? '#93c5fd' : '#f9a8d4'}
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight="bold"
                        fill={isMale ? '#2563eb' : '#db2777'}
                      >
                        {node.data.sonsCount + node.data.daughtersCount}
                      </text>
                    </g>
                  )}

                  {/* "Click to select" indicator for male members */}
                  {isSelectable && !isSelected && isHovered && (
                    <g transform="translate(-50, -32)">
                      <rect
                        x={-25}
                        y={-8}
                        width={50}
                        height={16}
                        rx={8}
                        fill="#22c55e"
                      />
                      <text
                        x={0}
                        y={3}
                        textAnchor="middle"
                        fontSize={7}
                        fontWeight="bold"
                        fill="white"
                      >
                        اختر كأب
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && !hoveredNode.isNewMember && (
        <div
          className="absolute z-30 pointer-events-none bg-white rounded-xl shadow-2xl border-2 border-gray-100 p-4 min-w-[200px] max-w-[260px]"
          style={{
            left: Math.min(Math.max(tooltipPos.x + 15, 20), dimensions.width - 240),
            top: Math.min(Math.max(tooltipPos.y - 10, 20), dimensions.height - 180),
            transform: tooltipPos.x > dimensions.width / 2 ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="flex items-center gap-3 mb-2 pb-2 border-b">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 shadow-sm ${
              hoveredNode.gender === 'Male'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-pink-50 border-pink-300'
            }`}>
              {hoveredNode.gender === 'Male' ? '👨' : '👩'}
            </div>
            <div>
              <p className="font-bold text-gray-800">{hoveredNode.firstName}</p>
              <p className="text-xs text-gray-400">{hoveredNode.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-green-50 p-2 rounded-lg text-center">
              <span className="font-bold text-green-600 block text-sm">ج{hoveredNode.generation}</span>
              <span className="text-gray-500">الجيل</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <span className="font-bold text-gray-700 block text-sm">{hoveredNode.branch || 'الأصل'}</span>
              <span className="text-gray-500">الفرع</span>
            </div>
          </div>

          {hoveredNode.gender === 'Male' ? (
            <p className="text-xs text-center text-green-600 font-medium">
              {selectedFatherId === hoveredNode.id ? '✓ تم الاختيار' : '👆 انقر للاختيار كأب'}
            </p>
          ) : (
            <p className="text-xs text-center text-gray-400 font-medium">
              ❌ لا يمكن اختيار الإناث كأب
            </p>
          )}
        </div>
      )}

      {/* New Member Preview Tooltip */}
      {hoveredNode?.isNewMember && (
        <div
          className="absolute z-30 pointer-events-none bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-2xl border-2 border-green-300 p-4 min-w-[200px]"
          style={{
            left: Math.min(Math.max(tooltipPos.x + 15, 20), dimensions.width - 240),
            top: Math.min(Math.max(tooltipPos.y - 10, 20), dimensions.height - 150),
            transform: tooltipPos.x > dimensions.width / 2 ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-green-100 border-2 border-green-400">
              <UserPlus size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800">{hoveredNode.firstName || 'عضو جديد'}</p>
              <p className="text-xs text-green-600">معاينة • سيتم إضافته هنا</p>
            </div>
          </div>
          <p className="text-xs text-center text-green-700 font-medium bg-green-100 rounded-lg py-2">
            الجيل {hoveredNode.generation} • {hoveredNode.gender === 'Male' ? 'ذكر' : 'أنثى'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              🌳 مفتاح الأجيال
            </p>
            <p className="text-xs text-green-600 font-medium">
              انقر على أي ذكر 👨 لاختياره كأب
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
              <div
                key={gen}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})` }}
              >
                الجيل {gen}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-xl shadow-lg border text-xs text-gray-600 font-medium">
        🖱️ سحب للتحريك • 🔍 تمرير للتكبير • 👆 انقر لاختيار الأب
      </div>
    </div>
  );
}
