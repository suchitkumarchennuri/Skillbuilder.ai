import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { MarketInsights } from '../../lib/analyticsService';

interface ChartProps {
  insights: MarketInsights;
  location: {
    country: string;
    state: string;
  };
}

// Custom color palettes
const SKILL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
  '#D4A5A5', '#9B5DE5', '#00BBF9', '#00F5D4', '#FEE440'
];

const SALARY_COLORS = [
  '#FF9F1C', '#E71D36', '#2EC4B6', '#FDFFFC', '#011627',
  '#F72585', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'
];

const DISTRIBUTION_COLORS = [
  '#06D6A0', '#118AB2', '#073B4C', '#FFD93D', '#FF006E',
  '#8338EC', '#3A86FF', '#FB5607', '#FF006E', '#8338EC'
];

export function JobMarketVisualizations({ insights, location }: ChartProps) {
  const skillsChartRef = useRef<SVGSVGElement>(null);
  const salaryChartRef = useRef<SVGSVGElement>(null);
  const distributionChartRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Create tooltip div
  useEffect(() => {
    if (!tooltipRef.current) {
      const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'chart-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background-color', 'rgba(17, 24, 39, 0.95)')
        .style('color', '#e2e8f0')
        .style('padding', '8px 12px')
        .style('border-radius', '6px')
        .style('font-size', '14px')
        .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)')
        .style('z-index', '1000')
        .style('pointer-events', 'none')
        .style('max-width', '300px')
        .style('white-space', 'pre-wrap');

      tooltipRef.current = tooltip.node() as HTMLDivElement;
    }

    return () => {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  // Skills Chart
  useEffect(() => {
    if (!skillsChartRef.current || !insights.topSkills.length || !tooltipRef.current) return;

    const margin = { top: 20, right: 20, bottom: 40, left: 120 };
    const width = skillsChartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(skillsChartRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(insights.topSkills.map(d => d.skill))
      .range([0, height])
      .padding(0.2);

    // Custom color interpolation
    const colorScale = d3.scaleOrdinal()
      .domain(insights.topSkills.map(d => d.skill))
      .range(SKILL_COLORS);

    // Add gradient definitions with enhanced colors
    const gradient = svg.append('defs')
      .selectAll('linearGradient')
      .data(insights.topSkills)
      .enter()
      .append('linearGradient')
      .attr('id', (d, i) => `gradient-${i}`)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', (d, i) => SKILL_COLORS[i % SKILL_COLORS.length])
      .attr('stop-opacity', 0.9);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', (d, i) => SKILL_COLORS[i % SKILL_COLORS.length])
      .attr('stop-opacity', 0.6);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text')
      .style('fill', '#94a3b8');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('fill', '#94a3b8');

    // Add bars with enhanced interactivity
    const bars = g.selectAll('rect')
      .data(insights.topSkills)
      .enter()
      .append('rect')
      .attr('y', d => y(d.skill) || 0)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.percentage))
      .attr('fill', (d, i) => `url(#gradient-${i})`)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const tooltip = d3.select(tooltipRef.current!);
        
        // Enhanced tooltip content
        const tooltipContent = `
          <div class="font-semibold mb-1">${d.skill}</div>
          <div class="text-primary-400">Demand: ${d.percentage}%</div>
          <div class="text-sm text-dark-300">Trend: ${d.trend}</div>
          <div class="text-sm text-dark-300">Job Count: ${d.count}</div>
        `;
        
        tooltip
          .style('visibility', 'visible')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(tooltipContent);

        // Bar highlight effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('height', y.bandwidth() * 1.1)
          .attr('y', (y(d.skill) || 0) - (y.bandwidth() * 0.05));
      })
      .on('mousemove', function(event) {
        d3.select(tooltipRef.current!)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function() {
        d3.select(tooltipRef.current!)
          .style('visibility', 'hidden');

        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('height', y.bandwidth())
          .attr('y', (d: any) => y(d.skill) || 0);
      });

    // Add percentage labels
    g.selectAll('.percentage-label')
      .data(insights.topSkills)
      .enter()
      .append('text')
      .attr('class', 'percentage-label')
      .attr('x', d => x(d.percentage) + 5)
      .attr('y', d => (y(d.skill) || 0) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .style('fill', '#94a3b8')
      .style('font-size', '12px')
      .text(d => `${Math.round(d.percentage)}%`);
  }, [insights.topSkills]);

  // Salary Chart
  useEffect(() => {
    if (!salaryChartRef.current || !insights.salaryTrends.length || !tooltipRef.current) return;

    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const width = salaryChartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(salaryChartRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(insights.salaryTrends.map(d => d.jobTitle))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(insights.salaryTrends, d => d.avgMax) || 0])
      .range([height, 0]);

    // Custom color interpolation for salary bars
    const colorScale = d3.scaleOrdinal()
      .domain(insights.salaryTrends.map(d => d.jobTitle))
      .range(SALARY_COLORS);

    // Add gradient definitions with enhanced colors
    const gradient = svg.append('defs')
      .selectAll('linearGradient')
      .data(insights.salaryTrends)
      .enter()
      .append('linearGradient')
      .attr('id', (d, i) => `salary-gradient-${i}`)
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '100%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', (d, i) => SALARY_COLORS[i % SALARY_COLORS.length])
      .attr('stop-opacity', 0.6);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', (d, i) => SALARY_COLORS[i % SALARY_COLORS.length])
      .attr('stop-opacity', 0.9);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('fill', '#94a3b8')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => `$${d/1000}k`))
      .selectAll('text')
      .style('fill', '#94a3b8');

    // Add salary range bars with enhanced interactivity
    const bars = g.selectAll('.salary-range')
      .data(insights.salaryTrends)
      .enter()
      .append('rect')
      .attr('class', 'salary-range')
      .attr('x', d => x(d.jobTitle) || 0)
      .attr('width', x.bandwidth())
      .attr('y', d => y(d.avgMax))
      .attr('height', d => y(d.avgMin) - y(d.avgMax))
      .attr('fill', (d, i) => `url(#salary-gradient-${i})`)
      .attr('rx', 4)
      .attr('ry', 4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const tooltip = d3.select(tooltipRef.current!);
        
        // Enhanced tooltip content
        const tooltipContent = `
          <div class="font-semibold mb-1">${d.jobTitle}</div>
          <div class="text-primary-400">Salary Range:</div>
          <div class="text-sm text-dark-300">Min: $${Math.round(d.avgMin/1000)}k</div>
          <div class="text-sm text-dark-300">Max: $${Math.round(d.avgMax/1000)}k</div>
          <div class="text-sm text-dark-300 mt-1">Trend: ${d.trend}</div>
        `;
        
        tooltip
          .style('visibility', 'visible')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(tooltipContent);

        // Bar highlight effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('width', x.bandwidth() * 1.1)
          .attr('x', (x(d.jobTitle) || 0) - (x.bandwidth() * 0.05));
      })
      .on('mousemove', function(event) {
        d3.select(tooltipRef.current!)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function(event, d) {
        d3.select(tooltipRef.current!)
          .style('visibility', 'hidden');

        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('width', x.bandwidth())
          .attr('x', x(d.jobTitle) || 0);
      });

    // Add salary labels
    g.selectAll('.salary-label')
      .data(insights.salaryTrends)
      .enter()
      .append('text')
      .attr('class', 'salary-label')
      .attr('x', d => (x(d.jobTitle) || 0) + x.bandwidth() / 2)
      .attr('y', d => y(d.avgMax) - 5)
      .attr('text-anchor', 'middle')
      .style('fill', '#94a3b8')
      .style('font-size', '12px')
      .text(d => `$${Math.round(d.avgMax/1000)}k`);
  }, [insights.salaryTrends]);

  // Role Distribution Chart
  useEffect(() => {
    if (!distributionChartRef.current || !insights.roleDistribution.length || !tooltipRef.current) return;

    const width = distributionChartRef.current.clientWidth;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(distributionChartRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${width/2},${height/2})`);

    // Custom color interpolation for pie chart
    const color = d3.scaleOrdinal()
      .domain(insights.roleDistribution.map(d => d.role))
      .range(DISTRIBUTION_COLORS);

    const pie = d3.pie<any>()
      .value(d => d.percentage)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8);

    const outerArc = d3.arc<any>()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    const arcs = g.selectAll('.arc')
      .data(pie(insights.roleDistribution))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Add gradient definitions with enhanced colors
    const gradient = svg.append('defs')
      .selectAll('linearGradient')
      .data(insights.roleDistribution)
      .enter()
      .append('linearGradient')
      .attr('id', (d, i) => `pie-gradient-${i}`)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', (d, i) => DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length])
      .attr('stop-opacity', 0.9);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', (d, i) => DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length])
      .attr('stop-opacity', 0.6);

    // Add pie segments with enhanced interactivity
    const paths = arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => `url(#pie-gradient-${i})`)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const tooltip = d3.select(tooltipRef.current!);
        
        // Enhanced tooltip content
        const tooltipContent = `
          <div class="font-semibold mb-1">${d.data.role}</div>
          <div class="text-primary-400">Distribution: ${Math.round(d.data.percentage)}%</div>
          <div class="text-sm text-dark-300">Job Count: ${d.data.count}</div>
        `;
        
        tooltip
          .style('visibility', 'visible')
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`)
          .html(tooltipContent);

        // Segment highlight effect
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', function(d: any) {
            const centroid = arc.centroid(d);
            const x = centroid[0] * 0.1;
            const y = centroid[1] * 0.1;
            return `translate(${x},${y})`;
          });
      })
      .on('mousemove', function(event) {
        d3.select(tooltipRef.current!)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function() {
        d3.select(tooltipRef.current!)
          .style('visibility', 'hidden');

        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', 'translate(0,0)');
      });

    // Add labels
    arcs.append('text')
      .attr('transform', d => {
        const pos = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .attr('dy', '.35em')
      .style('text-anchor', d => {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        return midangle < Math.PI ? 'start' : 'end';
      })
      .style('fill', '#94a3b8')
      .style('font-size', '12px')
      .text(d => `${d.data.role} (${Math.round(d.data.percentage)}%)`);

    // Add polylines
    arcs.append('polyline')
      .attr('points', d => {
        const pos = outerArc.centroid(d);
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
        pos[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1);
        return [arc.centroid(d), outerArc.centroid(d), pos];
      })
      .style('fill', 'none')
      .style('stroke', '#475569')
      .style('stroke-width', '1px');
  }, [insights.roleDistribution]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Skills in {location.state}</h3>
        <svg ref={skillsChartRef} width="100%" height="300" />
      </div>
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Salary Ranges by Role</h3>
        <svg ref={salaryChartRef} width="100%" height="300" />
      </div>
      <div className="card p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-4">Role Distribution</h3>
        <svg ref={distributionChartRef} width="100%" height="300" />
      </div>
    </div>
  );
}