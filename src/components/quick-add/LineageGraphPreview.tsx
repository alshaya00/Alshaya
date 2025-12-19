'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '@/lib/types';
import { MatchCandidate } from '@/lib/matching';
import { generationColors, genderColors } from '@/config/theme';

interface LineageGraphPreviewProps {
  candidate: MatchCandidate;
  newPersonName: string;
  newPersonGender?: 'Male' | 'Female';
  width?: number;
  height?: number;
  compact?: boolean;
  showUncles?: boolean;
  showSiblings?: boolean;
}

interface GraphNode {
  id: string;
  name: string;
  generation: number;
  gender: 'Male' | 'Female';
  type: 'ancestor' | 'uncle' | 'sibling' | 'new_person';
  isNewPerson?: boolean;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

export default function LineageGraphPreview({
  candidate,
  newPersonName,
  newPersonGender = 'Male',
  width = 400,
  height = 350,
  compact = false,
  showUncles = true,
  showSiblings = true,
}: LineageGraphPreviewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Build graph nodes and links
  const { nodes, links } = useMemo(() => {
    const nodesList: GraphNode[] = [];
    const linksList: GraphLink[] = [];

    const centerX = width / 2;
    const topY = 40;
    const verticalGap = compact ? 60 : 70;
    const horizontalGap = compact ? 70 : 90;

    // Start from the top (oldest ancestor)
    let currentY = topY;
    let lastAncestorId: string | null = null;

    // Add ancestors from lineage (reversed, so oldest first)
    const lineageToShow = candidate.fullLineage.slice(-4); // Show up to 4 ancestors
    lineageToShow.forEach((ancestor, index) => {
      nodesList.push({
        id: ancestor.id,
        name: ancestor.firstName,
        generation: ancestor.generation,
        gender: ancestor.gender as 'Male' | 'Female',
        type: 'ancestor',
        x: centerX,
        y: currentY,
      });

      if (lastAncestorId) {
        linksList.push({ source: lastAncestorId, target: ancestor.id });
      }

      lastAncestorId = ancestor.id;
      currentY += verticalGap;
    });

    // Add uncles/aunts (siblings of the father) - at the father's level
    if (showUncles && candidate.unclesAunts.length > 0) {
      const fatherY = currentY - verticalGap; // Father is at previous level
      const unclesToShow = candidate.unclesAunts.slice(0, 2);

      unclesToShow.forEach((uncle, index) => {
        const side = index === 0 ? -1 : 1;
        nodesList.push({
          id: uncle.id,
          name: uncle.firstName,
          generation: uncle.generation,
          gender: uncle.gender as 'Male' | 'Female',
          type: 'uncle',
          x: centerX + (side * horizontalGap * 1.5),
          y: fatherY,
        });

        // Link to grandfather
        if (candidate.grandfather) {
          linksList.push({ source: candidate.grandfather.id, target: uncle.id });
        }
      });
    }

    // Add new person
    const newPersonY = currentY;
    const newPersonId = 'NEW_PERSON';
    nodesList.push({
      id: newPersonId,
      name: newPersonName || '?',
      generation: candidate.generation,
      gender: newPersonGender,
      type: 'new_person',
      isNewPerson: true,
      x: centerX,
      y: newPersonY,
    });

    if (lastAncestorId) {
      linksList.push({ source: lastAncestorId, target: newPersonId });
    }

    // Add siblings (other children of the father)
    if (showSiblings && candidate.siblings.length > 0) {
      const siblingsToShow = candidate.siblings.slice(0, 3);
      const siblingStartX = centerX - ((siblingsToShow.length) * horizontalGap) / 2 - horizontalGap;

      siblingsToShow.forEach((sibling, index) => {
        const sibX = siblingStartX + (index < Math.floor(siblingsToShow.length / 2) ? index : index + 1) * horizontalGap;
        // Skip if too close to new person
        if (Math.abs(sibX - centerX) < horizontalGap * 0.8) return;

        nodesList.push({
          id: sibling.id,
          name: sibling.firstName,
          generation: sibling.generation,
          gender: sibling.gender as 'Male' | 'Female',
          type: 'sibling',
          x: sibX,
          y: newPersonY,
        });

        if (lastAncestorId) {
          linksList.push({ source: lastAncestorId, target: sibling.id });
        }
      });
    }

    return { nodes: nodesList, links: linksList };
  }, [candidate, newPersonName, newPersonGender, width, compact, showUncles, showSiblings]);

  // Render D3 graph
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Define gradients and filters
    const defs = svg.append('defs');

    // Male gradient
    const maleGrad = defs.append('linearGradient')
      .attr('id', 'lineage-male-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    maleGrad.append('stop').attr('offset', '0%').attr('stop-color', genderColors.male.gradient[0]);
    maleGrad.append('stop').attr('offset', '100%').attr('stop-color', genderColors.male.gradient[1]);

    // Female gradient
    const femaleGrad = defs.append('linearGradient')
      .attr('id', 'lineage-female-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    femaleGrad.append('stop').attr('offset', '0%').attr('stop-color', genderColors.female.gradient[0]);
    femaleGrad.append('stop').attr('offset', '100%').attr('stop-color', genderColors.female.gradient[1]);

    // New person gradient (gold)
    const newGrad = defs.append('linearGradient')
      .attr('id', 'lineage-new-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    newGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fbbf24');
    newGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b');

    // Shadow filter
    const shadow = defs.append('filter')
      .attr('id', 'lineage-shadow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    shadow.append('feDropShadow')
      .attr('dx', '0').attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', '#000')
      .attr('flood-opacity', '0.15');

    // Glow filter for new person
    const glow = defs.append('filter')
      .attr('id', 'lineage-glow')
      .attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%');
    glow.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    glow.append('feFlood')
      .attr('flood-color', '#fbbf24')
      .attr('result', 'color');
    const glowComposite = glow.append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'glow');
    const glowMerge = glow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'glow');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    // Draw links
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    links.forEach(link => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) return;

      const isToNewPerson = target.isNewPerson;

      g.append('path')
        .attr('d', `M ${source.x} ${(source.y || 0) + 25}
                    L ${source.x} ${((source.y || 0) + (target.y || 0)) / 2}
                    L ${target.x} ${((source.y || 0) + (target.y || 0)) / 2}
                    L ${target.x} ${(target.y || 0) - 25}`)
        .attr('fill', 'none')
        .attr('stroke', isToNewPerson ? '#fbbf24' : '#93c5fd')
        .attr('stroke-width', isToNewPerson ? 3 : 2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');
    });

    // Draw nodes
    nodes.forEach(node => {
      const nodeG = g.append('g')
        .attr('transform', `translate(${node.x}, ${node.y})`);

      const isNew = node.isNewPerson;
      const isMale = node.gender === 'Male';
      const nodeWidth = compact ? 60 : 70;
      const nodeHeight = compact ? 45 : 50;

      // Glow ring for new person
      if (isNew) {
        nodeG.append('rect')
          .attr('x', -nodeWidth / 2 - 4)
          .attr('y', -nodeHeight / 2 - 4)
          .attr('width', nodeWidth + 8)
          .attr('height', nodeHeight + 8)
          .attr('rx', 12)
          .attr('fill', 'none')
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 2)
          .attr('filter', 'url(#lineage-glow)')
          .attr('class', 'animate-pulse');
      }

      // Node background
      nodeG.append('rect')
        .attr('x', -nodeWidth / 2)
        .attr('y', -nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('rx', 10)
        .attr('fill', 'white')
        .attr('stroke', isNew ? '#f59e0b' : (isMale ? genderColors.male.primary : genderColors.female.primary))
        .attr('stroke-width', isNew ? 2 : 1.5)
        .attr('filter', 'url(#lineage-shadow)');

      // Avatar circle
      const avatarY = compact ? -8 : -10;
      const avatarR = compact ? 10 : 12;

      nodeG.append('circle')
        .attr('cx', 0)
        .attr('cy', avatarY)
        .attr('r', avatarR)
        .attr('fill', isNew ? 'url(#lineage-new-grad)' : (isMale ? 'url(#lineage-male-grad)' : 'url(#lineage-female-grad)'));

      // Avatar icon
      nodeG.append('text')
        .attr('x', 0)
        .attr('y', avatarY + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', compact ? 8 : 10)
        .attr('fill', 'white')
        .text(isNew ? '+' : (isMale ? '♂' : '♀'));

      // Star for new person
      if (isNew) {
        nodeG.append('text')
          .attr('x', nodeWidth / 2 - 8)
          .attr('y', -nodeHeight / 2 + 12)
          .attr('font-size', 10)
          .text('⭐');
      }

      // Name
      const nameY = compact ? 12 : 14;
      nodeG.append('text')
        .attr('x', 0)
        .attr('y', nameY)
        .attr('text-anchor', 'middle')
        .attr('font-size', compact ? 9 : 10)
        .attr('font-weight', isNew ? '700' : '600')
        .attr('fill', isNew ? '#92400e' : '#1f2937')
        .text(node.name.length > 7 ? node.name.slice(0, 7) + '..' : node.name);

      // Type label (for non-ancestors)
      if (node.type === 'uncle' || node.type === 'sibling') {
        const labelY = compact ? 22 : 24;
        nodeG.append('text')
          .attr('x', 0)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('font-size', 7)
          .attr('fill', '#9ca3af')
          .text(node.type === 'uncle' ? (isMale ? 'عم' : 'عمة') : (isMale ? 'أخ' : 'أخت'));
      }

      // Generation badge for ancestors
      if (node.type === 'ancestor') {
        const genColor = generationColors[node.generation]?.primary || '#6b7280';
        nodeG.append('circle')
          .attr('cx', nodeWidth / 2 - 5)
          .attr('cy', -nodeHeight / 2 + 5)
          .attr('r', 8)
          .attr('fill', genColor);
        nodeG.append('text')
          .attr('x', nodeWidth / 2 - 5)
          .attr('y', -nodeHeight / 2 + 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', 8)
          .attr('fill', 'white')
          .attr('font-weight', '600')
          .text(node.generation);
      }
    });

  }, [nodes, links, width, height, compact]);

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white rounded-lg border overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        style={{ maxWidth: width }}
      />
    </div>
  );
}
