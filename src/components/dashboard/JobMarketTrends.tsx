import { useEffect, useRef, useState } from "react";
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
  const [isChartVisible, setIsChartVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component is mounted
    const timer = setTimeout(() => {
      setIsChartVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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

    // Find data for the selected role
    const roleData = insights.roleComparison.find(
      (r) => r.role === selectedRole
    );
    const avgSalary = roleData?.avgSalary || 100000;
    const demandScore = roleData?.demandScore || 50;
    const growthRate = roleData?.growthRate || 5;

    // Generate more meaningful time series data based on the insights
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    interface DataPoint {
      date: Date;
      demand: number;
      salary: number;
    }

    // Generate more realistic trends based on current values and growth rate
    const generateTrendData = (): DataPoint[] => {
      const data: DataPoint[] = [];
      const monthlyGrowth = growthRate / 12;
      const volatility = growthRate > 0 ? 0.05 : 0.08; // More volatility for declining markets

      for (let i = 0; i < 12; i++) {
        const date = new Date(oneYearAgo);
        date.setMonth(oneYearAgo.getMonth() + i);

        // Calculate the trend values with some randomness
        const trendProgress = i / 11; // 0 to 1 over the time period
        const randomFactor = 1 + (Math.random() * 2 - 1) * volatility;

        // Demand starts from a lower value and grows to current value
        const baseDemand = demandScore / (1 + growthRate / 100);
        const demandAtPoint =
          baseDemand + (demandScore - baseDemand) * trendProgress;

        // Salary follows similar trend but with less volatility
        const baseSalary = avgSalary / (1 + growthRate / 200);
        const salaryAtPoint =
          baseSalary + (avgSalary - baseSalary) * trendProgress;

        data.push({
          date,
          demand: demandAtPoint * randomFactor,
          salary:
            salaryAtPoint * (1 + (Math.random() * 2 - 1) * (volatility / 2)),
        });
      }

      return data;
    };

    const data = generateTrendData();

    // Scales with dynamic domains based on data
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const maxDemand = d3.max(data, (d) => d.demand) || 100;
    const y = d3
      .scaleLinear()
      .domain([0, maxDemand * 1.1]) // Add 10% padding at the top
      .range([innerHeight, 0]);

    const minSalary = d3.min(data, (d) => d.salary) || avgSalary * 0.8;
    const maxSalary = d3.max(data, (d) => d.salary) || avgSalary * 1.2;
    const salaryPadding = (maxSalary - minSalary) * 0.1;

    const y2 = d3
      .scaleLinear()
      .domain([minSalary - salaryPadding, maxSalary + salaryPadding])
      .range([innerHeight, 0]);

    // Add grid lines for better readability
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      );

    // Area generators
    const demandArea = d3
      .area<DataPoint>()
      .x((d) => x(d.date))
      .y0(innerHeight)
      .y1((d) => y(d.demand))
      .curve(d3.curveCatmullRom);

    const valueLine = d3
      .line<DataPoint>()
      .x((d) => x(d.date))
      .y((d) => y2(d.salary))
      .curve(d3.curveCatmullRom);

    // Add areas and lines with animations
    const areaPath = g
      .append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", demandArea)
      .attr("fill", "url(#area-gradient)")
      .attr("opacity", 0);

    const linePath = g
      .append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", valueLine)
      .attr("fill", "none")
      .attr("stroke", "#60a5fa")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", function () {
        return this.getTotalLength();
      })
      .attr("stroke-dashoffset", function () {
        return this.getTotalLength();
      });

    // Add data points for the salary line
    g.selectAll(".data-point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y2(d.salary))
      .attr("r", 0)
      .attr("fill", "#60a5fa")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5);

    // Animate the elements when chart becomes visible
    if (isChartVisible) {
      areaPath.transition().duration(1000).attr("opacity", 0.3);

      linePath.transition().duration(1500).attr("stroke-dashoffset", 0);

      g.selectAll(".data-point")
        .transition()
        .delay((_, i) => i * 100)
        .duration(500)
        .attr("r", 4);
    }

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
      .attr("stop-color", "#60a5fa")
      .attr("stop-opacity", 0.8);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#60a5fa")
      .attr("stop-opacity", 0);

    // Add axes
    const xAxis = d3
      .axisBottom(x)
      .ticks(6)
      .tickFormat(d3.timeFormat("%b %Y") as any);

    const yAxisLeft = d3
      .axisLeft(y)
      .ticks(5)
      .tickFormat((d) => `${Math.round(d as number)}%`);

    const yAxisRight = d3
      .axisRight(y2)
      .ticks(5)
      .tickFormat((d) => `$${Math.round((d as number) / 1000)}k`);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "11px");

    g.append("g")
      .call(yAxisLeft)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "11px");

    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(yAxisRight)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "11px");

    // Add hover effects
    const focus = g.append("g").style("display", "none");

    focus
      .append("line")
      .attr("class", "focus-line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("y1", 0)
      .attr("y2", innerHeight);

    focus
      .append("circle")
      .attr("class", "focus-circle demand")
      .attr("r", 5)
      .attr("fill", "#60a5fa")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    focus
      .append("circle")
      .attr("class", "focus-circle salary")
      .attr("r", 5)
      .attr("fill", "#22d3ee")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

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
        .attr("transform", `translate(${x(d.date)},0)`);

      focus.select(".demand").attr("transform", `translate(0,${y(d.demand)})`);

      focus.select(".salary").attr("transform", `translate(0,${y2(d.salary)})`);

      const tooltip = d3.select(tooltipRef.current);
      if (tooltipRef.current) {
        tooltip
          .style("visibility", "visible")
          .style("display", "block")
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 30}px`).html(`
            <div class="font-semibold text-white">${d3.timeFormat("%B %Y")(
              d.date
            )}</div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 inline-block bg-blue-400 rounded-full"></span>
              <span class="text-blue-400">Demand: ${d.demand.toFixed(1)}%</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 inline-block bg-cyan-400 rounded-full"></span>
              <span class="text-cyan-400">Salary: $${Math.round(
                d.salary / 1000
              )}k</span>
            </div>
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

    // Add labels for better context
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 15)
      .attr("text-anchor", "start")
      .attr("font-size", "12px")
      .attr("fill", "#94a3b8")
      .text(`Trends for ${selectedRole}`);
  }, [insights.roleComparison, selectedRole, isChartVisible]);

  return (
    <div
      className="relative transition-opacity duration-500"
      style={{ opacity: isChartVisible ? 1 : 0 }}
    >
      <div className="flex justify-between text-xs text-dark-400 mb-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
          <span>Demand %</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
          <span>Salary</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" />
      <div
        ref={tooltipRef}
        className="absolute invisible bg-dark-800/95 px-3 py-2 rounded-lg shadow-xl
                   border border-dark-700/50 backdrop-blur-sm text-sm leading-relaxed z-10"
        style={{ pointerEvents: "none", display: "none", position: "fixed" }}
      />
    </div>
  );
}
