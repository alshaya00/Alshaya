'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import Link from 'next/link';
import { FamilyMember, MilkFamily } from '@/lib/types';
import { ZoomIn, ZoomOut, Maximize2, Home } from 'lucide-react';
import { relationshipColors, genderColors } from '@/config/theme';

interface MemberMiniGraphProps {
  person: FamilyMember;
  father: FamilyMember | null;
  siblings: FamilyMember[];
  children: FamilyMember[];
  grandchildren: FamilyMember[];
  milkFamilies: MilkFamily[];
  onSelectMember?: (member: FamilyMember) => void;
}

interface GraphNode {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  type: 'person' | 'father' | 'sibling' | 'child' | 'grandchild' | 'milk_mother' | 'milk_father' | 'milk_sibling';
  isMainPerson?: boolean;
  isExternal?: boolean;
  fullNameAr?: string | null;
  x?: number;
  y?: number;
  member?: FamilyMember;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'blood' | 'milk';
}

// Use colors from centralized theme config
const COLORS = {
  blood: {
    line: relationshipColors.blood.line,
    lineShadow: relationshipColors.blood.shadow,
  },
  milk: {
    line: relationshipColors.milk.line,
    lineShadow: relationshipColors.milk.shadow,
    background: relationshipColors.milk.background,
  },
  male: {
    bg: genderColors.male.secondary,
    border: genderColors.male.primary,
    gradient: genderColors.male.gradient,
  },
  female: {
    bg: genderColors.female.secondary,
    border: genderColors.female.primary,
    gradient: genderColors.female.gradient,
  },
  mainPerson: {
    ring: relationshipColors.mainPerson.ring,
    glow: relationshipColors.mainPerson.glow,
  },
};

export default function MemberMiniGraph({
  person,
  father,
  siblings,
  children,
  grandchildren,
  milkFamilies,
  onSelectMember,
}: MemberMiniGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const hasMilkFamily = milkFamilies.length > 0;

  // Build nodes and links
  const { nodes, links } = useMemo(() => {
    const nodesList: GraphNode[] = [];
    const linksList: GraphLink[] = [];

    // Calculate positions
    const centerX = hasMilkFamily ? dimensions.width * 0.35 : dimensions.width * 0.5;
    const milkCenterX = dimensions.width * 0.75;

    // Spacing
    const nodeWidth = 100;
    const nodeHeight = 70;
    const verticalGap = 100;
    const horizontalGap = 120;

    // ========== BLOOD FAMILY (Left/Center) ==========

    // Father node
    if (father) {
      nodesList.push({
        id: father.id,
        name: father.firstName,
        gender: father.gender as 'Male' | 'Female',
        type: 'father',
        fullNameAr: father.fullNameAr,
        x: centerX,
        y: 50,
        member: father,
      });
      linksList.push({ source: father.id, target: person.id, type: 'blood' });
    }

    // Main person (center)
    const mainPersonY = father ? 50 + verticalGap : 80;
    nodesList.push({
      id: person.id,
      name: person.firstName,
      gender: person.gender as 'Male' | 'Female',
      type: 'person',
      isMainPerson: true,
      fullNameAr: person.fullNameAr,
      x: centerX,
      y: mainPersonY,
      member: person,
    });

    // Siblings
    const siblingsToShow = siblings.slice(0, 4); // Limit to 4 siblings
    const siblingStartX = centerX - ((siblingsToShow.length) * horizontalGap) / 2;
    siblingsToShow.forEach((sibling, index) => {
      const sibX = siblingStartX + index * horizontalGap;
      // Skip if too close to main person
      if (Math.abs(sibX - centerX) < nodeWidth) return;

      nodesList.push({
        id: sibling.id,
        name: sibling.firstName,
        gender: sibling.gender as 'Male' | 'Female',
        type: 'sibling',
        fullNameAr: sibling.fullNameAr,
        x: sibX,
        y: mainPersonY,
        member: sibling,
      });
      if (father) {
        linksList.push({ source: father.id, target: sibling.id, type: 'blood' });
      }
    });

    // Children
    const childrenToShow = children.slice(0, 5);
    const childY = mainPersonY + verticalGap;
    const childStartX = centerX - ((childrenToShow.length - 1) * horizontalGap) / 2;
    childrenToShow.forEach((child, index) => {
      nodesList.push({
        id: child.id,
        name: child.firstName,
        gender: child.gender as 'Male' | 'Female',
        type: 'child',
        fullNameAr: child.fullNameAr,
        x: childStartX + index * horizontalGap,
        y: childY,
        member: child,
      });
      linksList.push({ source: person.id, target: child.id, type: 'blood' });
    });

    // Grandchildren (show under first 2 children max)
    const grandchildY = childY + verticalGap;
    let grandchildIndex = 0;
    childrenToShow.slice(0, 2).forEach((child) => {
      const childGrandchildren = grandchildren.filter(gc =>
        gc.fatherId === child.id
      ).slice(0, 2);

      childGrandchildren.forEach((gc) => {
        const childNode = nodesList.find(n => n.id === child.id);
        if (childNode) {
          nodesList.push({
            id: gc.id,
            name: gc.firstName,
            gender: gc.gender as 'Male' | 'Female',
            type: 'grandchild',
            fullNameAr: gc.fullNameAr,
            x: (childNode.x || centerX) + (grandchildIndex % 2 === 0 ? -40 : 40),
            y: grandchildY,
            member: gc,
          });
          linksList.push({ source: child.id, target: gc.id, type: 'blood' });
          grandchildIndex++;
        }
      });
    });

    // ========== MILK FAMILY (Right) ==========
    if (hasMilkFamily) {
      milkFamilies.forEach((milkFamily, familyIndex) => {
        const familyOffsetY = familyIndex * 180;
        const milkY = mainPersonY + 80 + familyOffsetY;

        // Milk mother
        const milkMother = milkFamily.milkMother;
        if (milkMother) {
          const milkMotherId = 'isExternal' in milkMother
            ? `external_mother_${familyIndex}`
            : milkMother.id;

          nodesList.push({
            id: milkMotherId,
            name: 'isExternal' in milkMother ? milkMother.name : milkMother.firstName,
            gender: 'Female',
            type: 'milk_mother',
            isExternal: 'isExternal' in milkMother,
            fullNameAr: 'isExternal' in milkMother ? milkMother.name : milkMother.fullNameAr,
            x: milkCenterX,
            y: milkY,
            member: 'isExternal' in milkMother ? undefined : milkMother,
          });

          // Link from main person to milk mother (dotted)
          linksList.push({ source: person.id, target: milkMotherId, type: 'milk' });

          // Milk father (next to milk mother)
          const milkFather = milkFamily.milkFather;
          if (milkFather) {
            const milkFatherId = 'isExternal' in milkFather
              ? `external_father_${familyIndex}`
              : milkFather.id;

            nodesList.push({
              id: milkFatherId,
              name: 'isExternal' in milkFather ? milkFather.name : milkFather.firstName,
              gender: 'Male',
              type: 'milk_father',
              isExternal: 'isExternal' in milkFather,
              fullNameAr: 'isExternal' in milkFather ? milkFather.name : milkFather.fullNameAr,
              x: milkCenterX - 100,
              y: milkY,
              member: 'isExternal' in milkFather ? undefined : milkFather,
            });
          }

          // Milk siblings
          const milkSiblingsToShow = milkFamily.milkSiblings.slice(0, 3);
          const milkSibY = milkY + 80;
          const milkSibStartX = milkCenterX - ((milkSiblingsToShow.length - 1) * 90) / 2;

          milkSiblingsToShow.forEach((milkSib, sibIndex) => {
            nodesList.push({
              id: milkSib.id,
              name: milkSib.firstName,
              gender: milkSib.gender,
              type: 'milk_sibling',
              fullNameAr: milkSib.fullNameAr,
              x: milkSibStartX + sibIndex * 90,
              y: milkSibY,
            });
            linksList.push({ source: milkMotherId, target: milkSib.id, type: 'milk' });
          });
        }
      });
    }

    return { nodes: nodesList, links: linksList };
  }, [person, father, siblings, children, grandchildren, milkFamilies, dimensions.width, hasMilkFamily]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 400), height: 500 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize D3 zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Initial transform
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoom.transform, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

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
    const resetTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.transition().duration(500).call(zoomRef.current.transform, resetTransform);
  }, []);

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const generateLinkPath = (link: GraphLink) => {
    const source = getNodeById(link.source);
    const target = getNodeById(link.target);
    if (!source || !target) return '';

    const sx = source.x || 0;
    const sy = source.y || 0;
    const tx = target.x || 0;
    const ty = target.y || 0;

    // For milk relationships, create a curved path
    if (link.type === 'milk') {
      const midY = (sy + ty) / 2;
      return `M ${sx} ${sy + 30}
              Q ${sx + (tx - sx) / 2} ${midY}
              ${tx} ${ty - 30}`;
    }

    // For blood relationships, use orthogonal lines
    if (sy < ty) {
      // Parent to child
      const midY = (sy + 35 + ty - 35) / 2;
      return `M ${sx} ${sy + 35}
              L ${sx} ${midY}
              L ${tx} ${midY}
              L ${tx} ${ty - 35}`;
    } else {
      // Same level (shouldn't happen often)
      return `M ${sx} ${sy} L ${tx} ${ty}`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-500 to-indigo-600 px-4 py-3 text-white flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <span className="text-xl">🌳</span>
          شجرة العائلة المصغرة
        </h3>
        <div className="flex gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="تكبير"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="تصغير"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="إعادة ضبط"
          >
            <Home size={18} />
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="relative" style={{ height: dimensions.height }}>
        {/* Legend */}
        <div className="absolute top-2 right-2 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow border p-2 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-0.5 bg-blue-500"></div>
            <span className="text-gray-600">خط النسب</span>
          </div>
          {hasMilkFamily && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-teal-500"></div>
              <span className="text-gray-600">خط الرضاعة</span>
            </div>
          )}
        </div>

        {/* Section Labels */}
        {hasMilkFamily && (
          <>
            <div className="absolute top-2 left-2 z-10 bg-blue-50 px-2 py-1 rounded text-xs text-blue-700 font-medium">
              العائلة الحقيقية
            </div>
            <div className="absolute top-2 left-1/2 z-10 bg-teal-50 px-2 py-1 rounded text-xs text-teal-700 font-medium">
              عائلة الرضاعة
            </div>
          </>
        )}

        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-grab active:cursor-grabbing"
        >
          <defs>
            <linearGradient id="mini-male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={COLORS.male.gradient[0]} />
              <stop offset="100%" stopColor={COLORS.male.gradient[1]} />
            </linearGradient>
            <linearGradient id="mini-female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={COLORS.female.gradient[0]} />
              <stop offset="100%" stopColor={COLORS.female.gradient[1]} />
            </linearGradient>
            <filter id="mini-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.1" />
            </filter>
            <filter id="mini-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor={COLORS.mainPerson.ring} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g ref={gRef}>
            {/* Milk family background */}
            {hasMilkFamily && (
              <rect
                x={dimensions.width * 0.55}
                y={0}
                width={dimensions.width * 0.45}
                height={dimensions.height}
                fill={COLORS.milk.background}
                opacity={0.5}
              />
            )}

            {/* Divider line */}
            {hasMilkFamily && (
              <line
                x1={dimensions.width * 0.55}
                y1={0}
                x2={dimensions.width * 0.55}
                y2={dimensions.height}
                stroke="#e5e7eb"
                strokeWidth={2}
                strokeDasharray="8,4"
              />
            )}

            {/* Links */}
            <g className="links">
              {links.map((link, i) => (
                <g key={i}>
                  {/* Shadow line */}
                  <path
                    d={generateLinkPath(link)}
                    fill="none"
                    stroke={link.type === 'milk' ? COLORS.milk.lineShadow : COLORS.blood.lineShadow}
                    strokeWidth={6}
                    strokeOpacity={0.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={link.type === 'milk' ? '8,6' : undefined}
                  />
                  {/* Main line */}
                  <path
                    d={generateLinkPath(link)}
                    fill="none"
                    stroke={link.type === 'milk' ? COLORS.milk.line : COLORS.blood.line}
                    strokeWidth={link.type === 'milk' ? 2.5 : 3}
                    strokeOpacity={0.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={link.type === 'milk' ? '8,6' : undefined}
                  />
                </g>
              ))}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {nodes.map((node) => {
                const isMale = node.gender === 'Male';
                const isMain = node.isMainPerson;
                const isMilkRelation = ['milk_mother', 'milk_father', 'milk_sibling'].includes(node.type);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onClick={() => {
                      if (node.member && onSelectMember) {
                        onSelectMember(node.member);
                      }
                    }}
                    onMouseEnter={(e) => {
                      setHoveredNode(node);
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
                    {/* Highlight ring for main person */}
                    {isMain && (
                      <rect
                        x={-48}
                        y={-38}
                        width={96}
                        height={76}
                        rx={14}
                        fill="none"
                        stroke={COLORS.mainPerson.ring}
                        strokeWidth={3}
                        filter="url(#mini-glow)"
                        className="animate-pulse"
                      />
                    )}

                    {/* Card background */}
                    <rect
                      x={-42}
                      y={-32}
                      width={84}
                      height={64}
                      rx={12}
                      fill="white"
                      filter="url(#mini-shadow)"
                      stroke={isMilkRelation ? COLORS.milk.line : (isMale ? COLORS.male.border : COLORS.female.border)}
                      strokeWidth={isMilkRelation ? 2 : 1.5}
                      strokeDasharray={isMilkRelation ? '4,2' : undefined}
                    />

                    {/* Avatar */}
                    <circle
                      cx={0}
                      cy={-10}
                      r={16}
                      fill={`url(#mini-${isMale ? 'male' : 'female'}-gradient)`}
                      stroke="white"
                      strokeWidth={2}
                    />

                    {/* Avatar icon */}
                    <text
                      x={0}
                      y={-6}
                      textAnchor="middle"
                      fontSize={12}
                      fill="white"
                    >
                      {node.type === 'milk_mother' ? '🤱' : (isMale ? '♂' : '♀')}
                    </text>

                    {/* Star for main person */}
                    {isMain && (
                      <text
                        x={32}
                        y={-22}
                        fontSize={14}
                      >
                        ⭐
                      </text>
                    )}

                    {/* Name */}
                    <text
                      x={0}
                      y={14}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="600"
                      fill="#1f2937"
                    >
                      {node.name.length > 8 ? node.name.slice(0, 8) + '..' : node.name}
                    </text>

                    {/* Role label */}
                    <text
                      x={0}
                      y={26}
                      textAnchor="middle"
                      fontSize={8}
                      fill={isMilkRelation ? COLORS.milk.line : '#9ca3af'}
                    >
                      {node.type === 'father' && 'الأب'}
                      {node.type === 'sibling' && (isMale ? 'أخ' : 'أخت')}
                      {node.type === 'child' && (isMale ? 'ابن' : 'بنت')}
                      {node.type === 'grandchild' && (isMale ? 'حفيد' : 'حفيدة')}
                      {node.type === 'milk_mother' && 'أم الرضاعة'}
                      {node.type === 'milk_father' && 'أب الرضاعة'}
                      {node.type === 'milk_sibling' && (isMale ? 'أخ رضاعة' : 'أخت رضاعة')}
                      {node.type === 'person' && ''}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredNode && (
          <div
            className="absolute z-30 pointer-events-none bg-white rounded-lg shadow-xl border p-3 min-w-[160px]"
            style={{
              left: Math.min(Math.max(tooltipPos.x + 10, 10), dimensions.width - 180),
              top: Math.min(Math.max(tooltipPos.y - 10, 10), dimensions.height - 100),
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                hoveredNode.gender === 'Male' ? 'bg-blue-100' : 'bg-pink-100'
              }`}>
                {hoveredNode.gender === 'Male' ? '👨' : '👩'}
              </span>
              <div>
                <p className="font-bold text-gray-800 text-sm">{hoveredNode.name}</p>
                {hoveredNode.member && (
                  <p className="text-xs text-gray-400">{hoveredNode.member.id}</p>
                )}
              </div>
            </div>
            {hoveredNode.fullNameAr && (
              <p className="text-xs text-gray-600 bg-gray-50 p-1.5 rounded">
                {hoveredNode.fullNameAr}
              </p>
            )}
            {hoveredNode.member && (
              <p className="text-xs text-center text-indigo-600 mt-2">انقر للعرض</p>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 px-4 py-3 border-t flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">👨</span>
          <span className="text-gray-600">الإخوة: <strong>{siblings.length}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">👶</span>
          <span className="text-gray-600">الأبناء: <strong>{children.length}</strong></span>
        </div>
        {grandchildren.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs">👦</span>
            <span className="text-gray-600">الأحفاد: <strong>{grandchildren.length}</strong></span>
          </div>
        )}
        {hasMilkFamily && (
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs">🤱</span>
            <span className="text-gray-600">علاقات الرضاعة: <strong>{milkFamilies.length}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
