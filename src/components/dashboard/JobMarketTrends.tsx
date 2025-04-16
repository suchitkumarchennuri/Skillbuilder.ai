import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { MarketInsights } from "../../lib/analyticsService";

interface JobMarketTrendsProps {
  insights: MarketInsights;
  selectedRole: string;
}

export function JobMarketTrends({
  insights,
  selectedRole,
}: JobMarketTrendsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !insights.roleComparison.length) return;

    const width = svgRef.current.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Generate sample time series data
    const now = new Date();

    interface DataPoint {
      date: Date;
      value: number;
      demand: number;
      salary: number;
    }

    const data: DataPoint[] = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (11 - i));
      return {
        date,
        value: Math.random() * 100,
        demand: Math.random() * 100,
        salary: 80000 + Math.random() * 40000,
      };
    });

    // Scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    const y2 = d3.scaleLinear().domain([60000, 140000]).range([innerHeight, 0]);

    // Area generators
    const demandArea = d3
      .area<(typeof data)[0]>()
      .x((d) => x(d.date))
      .y0(innerHeight)
      .y1((d) => y(d.demand))
      .curve(d3.curveMonotoneX);

    const valueLine = d3
      .line<(typeof data)[0]>()
      .x((d) => x(d.date))
      .y((d) => y2(d.salary))
      .curve(d3.curveMonotoneX);

    // Add areas and lines
    g.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", demandArea)
      .attr("fill", "url(#area-gradient)")
      .attr("opacity", 0.3);

    g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", valueLine)
      .attr("fill", "none")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 2);

    // Add gradient
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f43f5e")
      .attr("stop-opacity", 0.8);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f43f5e")
      .attr("stop-opacity", 0);

    // Add axes
    const xAxis = d3
      .axisBottom(x)
      .ticks(6)
      .tickFormat(d3.timeFormat("%b %Y") as any);

    const yAxisLeft = d3
      .axisLeft(y)
      .ticks(5)
      .tickFormat((d) => `${d as number}%`);

    const yAxisRight = d3
      .axisRight(y2)
      .ticks(5)
      .tickFormat((d) => `$${(d as number) / 1000}k`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#94a3b8");

    g.append("g").call(yAxisLeft).selectAll("text").style("fill", "#94a3b8");

    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(yAxisRight)
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add hover effects
    const focus = g.append("g").style("display", "none");

    focus.append("circle").attr("r", 4).attr("fill", "#f43f5e");

    focus.append("circle").attr("r", 4).attr("fill", "#4ecdc4");

    const mousemove = function (event: any) {
      const [xPos] = d3.pointer(event);
      const bisect = d3.bisector((d: DataPoint) => d.date).left;
      const x0 = x.invert(xPos);
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const d =
        x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf()
          ? d1
          : d0;

      focus
        .style("display", null)
        .attr("transform", `translate(${x(d.date)},${y(d.demand)})`);

      const tooltip = d3.select(tooltipRef.current);
      if (tooltipRef.current) {
        tooltip
          .style("visibility", "visible")
          .style("display", "block")
          .style("left", `${event.clientX + 10}px`)
          .style("top", `${event.clientY - 10}px`).html(`
            <div class="font-semibold">${d3.timeFormat("%B %Y")(d.date)}</div>
            <div class="text-primary-400">Demand: ${d.demand.toFixed(1)}%</div>
            <div class="text-[#4ecdc4]">Salary: $${Math.round(
              d.salary / 1000
            )}k</div>
          `);
      }
    };

    const mouseout = function () {
      focus.style("display", "none");
      if (tooltipRef.current) {
        d3.select(tooltipRef.current)
          .style("visibility", "hidden")
          .style("display", "none");
      }
    };

    g.append("rect")
      .attr("class", "overlay")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", mousemove)
      .on("mouseout", mouseout);
  }, [insights.roleComparison, selectedRole]);

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full" />
      <div
        ref={tooltipRef}
        className="absolute invisible bg-dark-800/95 text-dark-100 px-3 py-2 rounded-lg shadow-xl
                   border border-dark-700/50 backdrop-blur-sm text-sm leading-relaxed z-10"
        style={{ pointerEvents: "none", display: "none", position: "fixed" }}
      />
    </div>
  );
}
