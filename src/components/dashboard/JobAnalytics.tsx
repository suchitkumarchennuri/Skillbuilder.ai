import React, { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  MapPin,
  Info,
  BriefcaseIcon,
  Users,
  TrendingDown,
} from "lucide-react";
import { analyticsService } from "../../lib/analyticsService";
import { JobMarketVisualizations } from "./JobMarketVisualizations";
import { LOCATIONS, TECH_ROLES } from "../../lib/constants";
import type { MarketInsights } from "../../lib/analyticsService";
import { JobMarketMap } from "./JobMarketMap";
import { JobMarketTrends } from "./JobMarketTrends";

export function JobAnalytics() {
  const [insights, setInsights] = useState<MarketInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<keyof typeof LOCATIONS>("United States");
  const [selectedState, setSelectedState] = useState<string>("California");
  const [selectedRole, setSelectedRole] = useState<string>(TECH_ROLES[0]);

  useEffect(() => {
    async function loadInsights() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await analyticsService.getMarketInsights(
          selectedState,
          selectedRole
        );
        setInsights(data);
      } catch (err) {
        console.error("Error loading market insights:", err);
        setError("Failed to load market insights. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadInsights();
  }, [selectedCountry, selectedState, selectedRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center text-red-400">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-dark-400 mx-auto mb-4" />
        <p className="text-dark-300">No market insights available</p>
      </div>
    );
  }

  const highestPaying =
    insights.roleComparison.length > 0
      ? insights.roleComparison.reduce((prev, current) =>
          current.avgSalary > prev.avgSalary ? current : prev
        )
      : { role: "No data", avgSalary: 0 };

  const mostInDemand =
    insights.roleComparison.length > 0
      ? insights.roleComparison.reduce((prev, current) =>
          current.count > prev.count ? current : prev
        )
      : { role: "No data", count: 0 };

  // Calculate average YoY growth rate from role comparison data
  const averageGrowthRate =
    insights.roleComparison.length > 0
      ? insights.roleComparison.reduce(
          (sum, role) => sum + role.growthRate,
          0
        ) / insights.roleComparison.length
      : 0;

  // Get the top location by job count
  const topLocation =
    insights.locationTrends.length > 0
      ? insights.locationTrends.reduce((prev, current) =>
          current.jobCount > prev.jobCount ? current : prev
        )
      : { location: selectedState, jobCount: 0, percentage: 0, avgSalary: 0 };

  // Calculate the current market trend based on role comparison data
  const marketTrend =
    insights.roleComparison.filter(
      (role) => role.marketSentiment === "positive"
    ).length >
    insights.roleComparison.filter(
      (role) => role.marketSentiment === "negative"
    ).length
      ? "positive"
      : "negative";

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-white">
            Job Market Analytics
          </h1>

          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value as keyof typeof LOCATIONS);
                setSelectedState(
                  LOCATIONS[e.target.value as keyof typeof LOCATIONS][0]
                );
              }}
              className="input min-w-[200px] transition-all duration-300 hover:border-primary-400 focus:border-primary-400"
            >
              {Object.keys(LOCATIONS).map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="input min-w-[200px] transition-all duration-300 hover:border-primary-400 focus:border-primary-400"
            >
              {LOCATIONS[selectedCountry].map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input min-w-[200px] transition-all duration-300 hover:border-primary-400 focus:border-primary-400"
            >
              {TECH_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card p-4 bg-primary-500/5 border-primary-500/20">
          <div className="flex items-center gap-2 text-sm text-primary-400">
            <Info className="h-4 w-4 flex-shrink-0" />
            <p>
              Market insights for{" "}
              <span className="font-semibold">{selectedRole}</span> in{" "}
              <span className="font-semibold">{selectedState}</span> are updated
              in real-time based on current job listings and industry trends.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-500/40 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Highest Paying Role</p>
              <h3 className="text-xl font-semibold text-white mt-1 group-hover:text-primary-300 transition-colors duration-300">
                {highestPaying.role}
              </h3>
              <p className="text-2xl font-bold text-primary-400 mt-2">
                ${Math.round(highestPaying.avgSalary / 1000)}k
              </p>
            </div>
            <div className="h-10 w-10 bg-primary-500/10 rounded-lg flex items-center justify-center group-hover:bg-primary-500/20 transition-all duration-300">
              <TrendingUp className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-500/40 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Most In-Demand Role</p>
              <h3 className="text-xl font-semibold text-white mt-1 group-hover:text-primary-300 transition-colors duration-300">
                {mostInDemand.role}
              </h3>
              <p className="text-2xl font-bold text-primary-400 mt-2">
                {mostInDemand.count.toLocaleString()} openings
              </p>
            </div>
            <div className="h-10 w-10 bg-primary-500/10 rounded-lg flex items-center justify-center group-hover:bg-primary-500/20 transition-all duration-300">
              <BriefcaseIcon className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-500/40 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Remote Work Opportunities</p>
              <h3 className="text-xl font-semibold text-white mt-1 group-hover:text-primary-300 transition-colors duration-300">
                Remote Jobs
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-2xl font-bold text-primary-400">
                  {Math.round(insights.remoteWork.percentage)}%
                </p>
                {insights.remoteWork.trend === "up" ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : insights.remoteWork.trend === "down" ? (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                ) : null}
              </div>
            </div>
            <div className="h-10 w-10 bg-primary-500/10 rounded-lg flex items-center justify-center group-hover:bg-primary-500/20 transition-all duration-300">
              <MapPin className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-500/40 group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">YoY Growth Rate</p>
              <h3 className="text-xl font-semibold text-white mt-1 group-hover:text-primary-300 transition-colors duration-300">
                {selectedRole}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-2xl font-bold text-primary-400">
                  {averageGrowthRate.toFixed(1)}%
                </p>
                {averageGrowthRate > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
            <div className="h-10 w-10 bg-primary-500/10 rounded-lg flex items-center justify-center group-hover:bg-primary-500/20 transition-all duration-300">
              <Users className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Geographic Distribution
          </h3>
          <JobMarketMap
            insights={insights}
            location={{ country: selectedCountry, state: selectedState }}
          />
        </div>

        <div className="card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">
            Market Trends Over Time
          </h3>
          <JobMarketTrends insights={insights} selectedRole={selectedRole} />
        </div>
      </div>

      <JobMarketVisualizations
        insights={insights}
        location={{ country: selectedCountry, state: selectedState }}
        selectedRole={selectedRole}
      />
    </div>
  );
}
