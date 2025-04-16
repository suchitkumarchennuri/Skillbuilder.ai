import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import type { MarketInsights } from "../../lib/analyticsService";

interface ChartProps {
  insights: MarketInsights;
  location: {
    country: string;
    state: string;
  };
  selectedRole: string;
}

// Custom color palette
const SKILL_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9B5DE5",
  "#00BBF9",
  "#00F5D4",
  "#FEE440",
];

export function JobMarketVisualizations({
  insights,
  location,
  selectedRole,
}: ChartProps) {
  const skillsChartRef = useRef<SVGSVGElement>(null);
  const skillGapsChartRef = useRef<SVGSVGElement>(null);
  const compensationChartRef = useRef<SVGSVGElement>(null);
  // Create a dedicated state for the tooltip element
  const [tooltipElement, setTooltipElement] = useState<HTMLDivElement | null>(
    null
  );

  // Create tooltip div
  useEffect(() => {
    // Only create the tooltip if it doesn't exist
    if (!tooltipElement) {
      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "chart-tooltip")
        .style("visibility", "hidden")
        .style("position", "absolute")
        .style("background-color", "rgba(17, 24, 39, 0.95)")
        .style("color", "#e2e8f0")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "14px")
        .style(
          "box-shadow",
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        )
        .style("z-index", "1000")
        .style("pointer-events", "none")
        .style("max-width", "300px")
        .style("white-space", "pre-wrap");

      setTooltipElement(tooltip.node() as HTMLDivElement);
    }

    // Cleanup function
    return () => {
      if (tooltipElement) {
        d3.select(tooltipElement).remove();
        setTooltipElement(null);
      }
    };
  }, [tooltipElement]);

  // Function to safely get tooltip selection
  const getTooltipSelection = useCallback(() => {
    return tooltipElement ? d3.select(tooltipElement) : null;
  }, [tooltipElement]);

  // Skills Chart
  useEffect(() => {
    if (
      !skillsChartRef.current ||
      !insights.topSkills.length ||
      !tooltipElement
    )
      return;

    const margin = { top: 20, right: 20, bottom: 40, left: 120 };
    const width =
      skillsChartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(skillsChartRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    const y = d3
      .scaleBand()
      .domain(insights.topSkills.map((d) => d.skill))
      .range([0, height])
      .padding(0.2);

    // Add gradient definitions
    const gradient = svg
      .append("defs")
      .selectAll("linearGradient")
      .data(insights.topSkills)
      .enter()
      .append("linearGradient")
      .attr("id", (_d, i) => `gradient-${i}`)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", (_d, i) => SKILL_COLORS[i % SKILL_COLORS.length])
      .attr("stop-opacity", 0.9);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", (_d, i) => SKILL_COLORS[i % SKILL_COLORS.length])
      .attr("stop-opacity", 0.6);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => `${d as number}%`)
      )
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add bars
    g.selectAll("rect")
      .data(insights.topSkills)
      .enter()
      .append("rect")
      .attr("y", (d) => y(d.skill) || 0)
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => x(d.percentage))
      .attr("fill", (_d, i) => `url(#gradient-${i})`)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        const tooltipContent = `
          <div class="font-semibold mb-1">${d.skill}</div>
          <div class="text-primary-400">Demand: ${d.percentage}%</div>
          <div class="text-sm text-dark-300">Trend: ${d.trend}</div>
          <div class="text-sm text-dark-300">Job Count: ${d.count}</div>
        `;

        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(tooltipContent);

        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("height", y.bandwidth() * 1.1)
          .attr("y", (y(d.skill) || 0) - y.bandwidth() * 0.05);
      })
      .on("mousemove", function (event) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function () {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip.style("visibility", "hidden");

        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("height", y.bandwidth())
          .attr("y", (d: any) => y(d.skill) || 0);
      });

    // Add percentage labels
    g.selectAll(".percentage-label")
      .data(insights.topSkills)
      .enter()
      .append("text")
      .attr("class", "percentage-label")
      .attr("x", (d) => x(d.percentage) + 5)
      .attr("y", (d) => (y(d.skill) || 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .style("fill", "#94a3b8")
      .style("font-size", "12px")
      .text((d) => `${Math.round(d.percentage)}%`);
  }, [insights.topSkills, tooltipElement, getTooltipSelection]);

  // Skill Gaps Chart
  useEffect(() => {
    if (
      !skillGapsChartRef.current ||
      !insights.skillGaps.length ||
      !tooltipElement
    )
      return;

    const margin = { top: 20, right: 20, bottom: 40, left: 120 };
    const width =
      skillGapsChartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(skillGapsChartRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    const y = d3
      .scaleBand()
      .domain(insights.skillGaps.map((d) => d.skill))
      .range([0, height])
      .padding(0.2);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => `${d as number}%`)
      )
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add demand bars
    g.selectAll(".demand-bar")
      .data(insights.skillGaps)
      .enter()
      .append("rect")
      .attr("class", "demand-bar")
      .attr("y", (d) => y(d.skill) || 0)
      .attr("height", y.bandwidth() / 2)
      .attr("x", 0)
      .attr("width", (d) => x(d.demandScore))
      .attr("fill", "#4ECDC4")
      .attr("rx", 4)
      .attr("ry", 4)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        const tooltipContent = `
          <div class="font-semibold mb-1">${d.skill}</div>
          <div class="text-primary-400">Demand Score: ${d.demandScore}%</div>
          <div class="text-sm text-dark-300">Supply Score: ${d.supplyScore}%</div>
          <div class="text-sm text-dark-300">Gap Score: ${d.gapScore}%</div>
        `;

        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(tooltipContent);
      })
      .on("mousemove", function (event) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function () {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip.style("visibility", "hidden");
      });

    // Add supply bars
    g.selectAll(".supply-bar")
      .data(insights.skillGaps)
      .enter()
      .append("rect")
      .attr("class", "supply-bar")
      .attr("y", (d) => (y(d.skill) || 0) + y.bandwidth() / 2)
      .attr("height", y.bandwidth() / 2)
      .attr("x", 0)
      .attr("width", (d) => x(d.supplyScore))
      .attr("fill", "#FF6B6B")
      .attr("rx", 4)
      .attr("ry", 4)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        const tooltipContent = `
          <div class="font-semibold mb-1">${d.skill}</div>
          <div class="text-primary-400">Supply Score: ${d.supplyScore}%</div>
          <div class="text-sm text-dark-300">Demand Score: ${d.demandScore}%</div>
          <div class="text-sm text-dark-300">Gap Score: ${d.gapScore}%</div>
        `;

        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(tooltipContent);
      })
      .on("mousemove", function (event) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function () {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip.style("visibility", "hidden");
      });
  }, [insights.skillGaps, tooltipElement, getTooltipSelection]);

  // Compensation Chart
  useEffect(() => {
    if (
      !compensationChartRef.current ||
      !insights.compensationInsights.length ||
      !tooltipElement
    )
      return;

    const margin = { top: 20, right: 20, bottom: 40, left: 120 };
    const width =
      compensationChartRef.current.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(compensationChartRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(insights.compensationInsights, (d) => d.avgTotal) || 0,
      ])
      .range([0, width]);

    const y = d3
      .scaleBand()
      .domain(insights.compensationInsights.map((d) => d.level))
      .range([0, height])
      .padding(0.2);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat((d) => `$${(d as number) / 1000}k`))
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("fill", "#94a3b8");

    // Add stacked bars
    const stack = d3
      .stack()
      .keys(["avgBase", "avgBonus", "avgEquity"])
      .value((d: any, key) => d[key]);

    const stackedData = stack(insights.compensationInsights as any);

    const colors = ["#4ECDC4", "#FF6B6B", "#FFD93D"];

    g.append("g")
      .selectAll("g")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("fill", (_d, i) => colors[i])
      .selectAll("rect")
      .data((d) => d)
      .enter()
      .append("rect")
      .attr("y", (d) => y((d.data as any).level) || 0)
      .attr("x", (d) => x(d[0]))
      .attr("width", (d) => x(d[1]) - x(d[0]))
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("ry", 4)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        const tooltipContent = `
          <div class="font-semibold mb-1">${(d.data as any).level}</div>
          <div class="text-primary-400">Total: $${Math.round(
            (d.data as any).avgTotal / 1000
          )}k</div>
          <div class="text-sm text-dark-300">Base: $${Math.round(
            (d.data as any).avgBase / 1000
          )}k</div>
          <div class="text-sm text-dark-300">Bonus: $${Math.round(
            (d.data as any).avgBonus / 1000
          )}k</div>
          <div class="text-sm text-dark-300">Equity: $${Math.round(
            (d.data as any).avgEquity / 1000
          )}k</div>
        `;

        tooltip
          .style("visibility", "visible")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`)
          .html(tooltipContent);
      })
      .on("mousemove", function (event) {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function () {
        const tooltip = getTooltipSelection();
        if (!tooltip) return;

        tooltip.style("visibility", "hidden");
      });
  }, [insights.compensationInsights, tooltipElement, getTooltipSelection]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Top Skills in {location.state}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">Demand Trend</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <svg ref={skillsChartRef} width="100%" height="300" />
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Skill Supply vs Demand
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#4ECDC4] rounded-full" />
                <span className="text-sm text-dark-400">Demand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#FF6B6B] rounded-full" />
                <span className="text-sm text-dark-400">Supply</span>
              </div>
            </div>
          </div>
          <svg ref={skillGapsChartRef} width="100%" height="300" />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Compensation Structure by Level
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#4ECDC4] rounded-full" />
              <span className="text-sm text-dark-400">Base</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#FF6B6B] rounded-full" />
              <span className="text-sm text-dark-400">Bonus</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#FFD93D] rounded-full" />
              <span className="text-sm text-dark-400">Equity</span>
            </div>
          </div>
        </div>
        <svg ref={compensationChartRef} width="100%" height="300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Industry Distribution
          </h3>
          <div className="space-y-4">
            {insights.industryTrends.map((industry, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-dark-200">{industry.industry}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <BarChart3 className="h-4 w-4 text-primary-400" />
                    <span className="text-sm text-dark-400">
                      {industry.jobCount} jobs
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary-400">
                    ${Math.round(industry.avgSalary / 1000)}k
                  </p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    {industry.growthRate >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm ${
                        industry.growthRate >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {Math.abs(industry.growthRate)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Market Sentiment Analysis
          </h3>
          <div className="space-y-4">
            {insights.roleComparison
              .filter((role) => role.role === selectedRole)
              .map((role, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-dark-200">Competition Level</p>
                      <p
                        className={`text-lg font-semibold ${
                          role.competitionLevel === "high"
                            ? "text-red-400"
                            : role.competitionLevel === "medium"
                            ? "text-amber-400"
                            : "text-green-400"
                        }`}
                      >
                        {role.competitionLevel.charAt(0).toUpperCase() +
                          role.competitionLevel.slice(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-dark-200">Market Sentiment</p>
                      <p
                        className={`text-lg font-semibold ${
                          role.marketSentiment === "positive"
                            ? "text-green-400"
                            : role.marketSentiment === "neutral"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {role.marketSentiment.charAt(0).toUpperCase() +
                          role.marketSentiment.slice(1)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-dark-200 mb-2">Demand Score</p>
                    <div className="w-full bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${role.demandScore}%` }}
                      />
                    </div>
                    <p className="text-sm text-dark-400 mt-1">
                      {Math.round(role.demandScore)}% of market demand
                    </p>
                  </div>

                  <div>
                    <p className="text-dark-200 mb-2">Growth Rate</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-primary-400">
                        {role.growthRate}%
                      </p>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm text-dark-400 mt-1">Year over Year</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
