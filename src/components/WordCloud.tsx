import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface WordCloudProps {
  words: Array<{
    text: string;
    value: number;
    category: 'match' | 'missing';
  }>;
  width?: number;
  height?: number;
}

export function WordCloud({ words, width = 600, height = 400 }: WordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous word cloud
    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const layout = cloud()
      .size([width, height])
      .words(words.map(w => ({ ...w, size: w.value })))
      .padding(5)
      .rotate(() => 0)
      .font('Arial')
      .fontSize(d => (d as any).size)
      .on('end', draw);

    layout.start();

    function draw(words: any[]) {
      const group = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      group.selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', d => `${d.size}px`)
        .style('font-family', 'Arial')
        .style('fill', (d: any) => d.category === 'match' ? '#059669' : '#DC2626')
        .style('cursor', 'pointer')
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .text(d => d.text)
        .on('mouseover', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style('font-size', (d: any) => `${d.size * 1.2}px`);
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .style('font-size', (d: any) => `${d.size}px`);
        });
    }
  }, [words, width, height]);

  return <div ref={containerRef} className="w-full h-full" />;
}