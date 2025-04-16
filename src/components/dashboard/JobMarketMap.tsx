import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Tooltip,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MarketInsights } from "../../lib/analyticsService";

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface JobMarketMapProps {
  insights: MarketInsights;
  location: {
    country: string;
    state: string;
  };
}

// Major tech hub cities with approximate coordinates
const TECH_HUBS = [
  {
    city: "San Francisco",
    state: "California",
    lat: 37.7749,
    lng: -122.4194,
    importance: 1.0,
  },
  {
    city: "Seattle",
    state: "Washington",
    lat: 47.6062,
    lng: -122.3321,
    importance: 0.9,
  },
  {
    city: "Austin",
    state: "Texas",
    lat: 30.2672,
    lng: -97.7431,
    importance: 0.8,
  },
  {
    city: "New York",
    state: "New York",
    lat: 40.7128,
    lng: -74.006,
    importance: 0.95,
  },
  {
    city: "Boston",
    state: "Massachusetts",
    lat: 42.3601,
    lng: -71.0589,
    importance: 0.8,
  },
  {
    city: "Chicago",
    state: "Illinois",
    lat: 41.8781,
    lng: -87.6298,
    importance: 0.7,
  },
  {
    city: "Los Angeles",
    state: "California",
    lat: 34.0522,
    lng: -118.2437,
    importance: 0.85,
  },
  {
    city: "Denver",
    state: "Colorado",
    lat: 39.7392,
    lng: -104.9903,
    importance: 0.7,
  },
  {
    city: "Atlanta",
    state: "Georgia",
    lat: 33.749,
    lng: -84.388,
    importance: 0.75,
  },
  {
    city: "Dallas",
    state: "Texas",
    lat: 32.7767,
    lng: -96.797,
    importance: 0.7,
  },
  {
    city: "Miami",
    state: "Florida",
    lat: 25.7617,
    lng: -80.1918,
    importance: 0.6,
  },
  {
    city: "Portland",
    state: "Oregon",
    lat: 45.5231,
    lng: -122.6765,
    importance: 0.65,
  },
  {
    city: "Pittsburgh",
    state: "Pennsylvania",
    lat: 40.4406,
    lng: -79.9959,
    importance: 0.6,
  },
  {
    city: "Salt Lake City",
    state: "Utah",
    lat: 40.7608,
    lng: -111.891,
    importance: 0.6,
  },
  {
    city: "Nashville",
    state: "Tennessee",
    lat: 36.1627,
    lng: -86.7816,
    importance: 0.55,
  },
  {
    city: "Raleigh",
    state: "North Carolina",
    lat: 35.7796,
    lng: -78.6382,
    importance: 0.6,
  },
  {
    city: "Detroit",
    state: "Michigan",
    lat: 42.3314,
    lng: -83.0458,
    importance: 0.5,
  },
  {
    city: "Phoenix",
    state: "Arizona",
    lat: 33.4484,
    lng: -112.074,
    importance: 0.65,
  },
];

// More specialized tech industry clusters
const SPECIALTY_TECH_CLUSTERS = [
  {
    city: "Research Triangle",
    state: "North Carolina",
    lat: 35.9132,
    lng: -78.8701,
    specialty: "Biotech",
    importance: 0.9,
  },
  {
    city: "Silicon Slopes",
    state: "Utah",
    lat: 40.5,
    lng: -111.8,
    specialty: "SaaS",
    importance: 0.8,
  },
  {
    city: "Silicon Hills",
    state: "Texas",
    lat: 30.3,
    lng: -97.7,
    specialty: "Enterprise Software",
    importance: 0.85,
  },
  {
    city: "Silicon Beach",
    state: "California",
    lat: 33.98,
    lng: -118.47,
    specialty: "Media Tech",
    importance: 0.82,
  },
  {
    city: "Silicon Alley",
    state: "New York",
    lat: 40.74,
    lng: -73.99,
    specialty: "Fintech",
    importance: 0.95,
  },
  {
    city: "Silicon Forest",
    state: "Oregon",
    lat: 45.52,
    lng: -122.68,
    specialty: "Hardware",
    importance: 0.75,
  },
  {
    city: "Tech Square",
    state: "Georgia",
    lat: 33.77,
    lng: -84.39,
    specialty: "Cybersecurity",
    importance: 0.77,
  },
  {
    city: "Dulles Technology Corridor",
    state: "Virginia",
    lat: 38.95,
    lng: -77.45,
    specialty: "Government Tech",
    importance: 0.83,
  },
  {
    city: "Route 128",
    state: "Massachusetts",
    lat: 42.35,
    lng: -71.1,
    specialty: "Robotics",
    importance: 0.88,
  },
  {
    city: "Denver Tech Center",
    state: "Colorado",
    lat: 39.65,
    lng: -104.88,
    specialty: "Telecom",
    importance: 0.76,
  },
  {
    city: "Lake Washington Tech Corridor",
    state: "Washington",
    lat: 47.62,
    lng: -122.21,
    specialty: "Cloud Computing",
    importance: 0.92,
  },
];

// Define Canadian tech hubs
const CANADA_TECH_HUBS = [
  {
    city: "Toronto",
    state: "Ontario",
    lat: 43.6532,
    lng: -79.3832,
    importance: 0.95,
  },
  {
    city: "Vancouver",
    state: "British Columbia",
    lat: 49.2827,
    lng: -123.1207,
    importance: 0.9,
  },
  {
    city: "Montreal",
    state: "Quebec",
    lat: 45.5017,
    lng: -73.5673,
    importance: 0.85,
  },
  {
    city: "Ottawa",
    state: "Ontario",
    lat: 45.4215,
    lng: -75.6972,
    importance: 0.8,
  },
  {
    city: "Calgary",
    state: "Alberta",
    lat: 51.0447,
    lng: -114.0719,
    importance: 0.75,
  },
  {
    city: "Edmonton",
    state: "Alberta",
    lat: 53.5461,
    lng: -113.4938,
    importance: 0.7,
  },
  {
    city: "Waterloo",
    state: "Ontario",
    lat: 43.4668,
    lng: -80.5164,
    importance: 0.85,
  },
  {
    city: "Halifax",
    state: "Nova Scotia",
    lat: 44.6488,
    lng: -63.5752,
    importance: 0.65,
  },
  {
    city: "Victoria",
    state: "British Columbia",
    lat: 48.4284,
    lng: -123.3656,
    importance: 0.7,
  },
  {
    city: "Quebec City",
    state: "Quebec",
    lat: 46.8139,
    lng: -71.208,
    importance: 0.65,
  },
];

// Define England tech hubs
const ENGLAND_TECH_HUBS = [
  {
    city: "London",
    state: "London",
    lat: 51.5074,
    lng: -0.1278,
    importance: 1.0,
  },
  {
    city: "Manchester",
    state: "North West",
    lat: 53.4808,
    lng: -2.2426,
    importance: 0.85,
  },
  {
    city: "Birmingham",
    state: "West Midlands",
    lat: 52.4862,
    lng: -1.8904,
    importance: 0.8,
  },
  {
    city: "Cambridge",
    state: "East of England",
    lat: 52.2053,
    lng: 0.1218,
    importance: 0.9,
  },
  {
    city: "Oxford",
    state: "South East",
    lat: 51.752,
    lng: -1.2577,
    importance: 0.85,
  },
  {
    city: "Bristol",
    state: "South West",
    lat: 51.4545,
    lng: -2.5879,
    importance: 0.8,
  },
  {
    city: "Leeds",
    state: "Yorkshire and the Humber",
    lat: 53.8008,
    lng: -1.5491,
    importance: 0.75,
  },
  {
    city: "Newcastle",
    state: "North East",
    lat: 54.9783,
    lng: -1.6178,
    importance: 0.7,
  },
  {
    city: "Nottingham",
    state: "East Midlands",
    lat: 52.9548,
    lng: -1.1581,
    importance: 0.7,
  },
];

// Define connections between tech hubs for each country

// Country data map files
const COUNTRY_MAP_DATA: Record<string, string> = {
  "United States": "/data/simple-states.json",
  Canada: "/data/canada-provinces.json",
  England: "/data/england-regions.json",
};

// Country tech hubs
const COUNTRY_TECH_HUBS: Record<string, any[]> = {
  "United States": [...TECH_HUBS, ...SPECIALTY_TECH_CLUSTERS],
  Canada: CANADA_TECH_HUBS,
  England: ENGLAND_TECH_HUBS,
};

// Map center positions and zoom levels for each country
const COUNTRY_MAP_CONFIG: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  "United States": { center: [39.8283, -98.5795], zoom: 4 },
  Canada: { center: [56.1304, -106.3468], zoom: 3 },
  England: { center: [52.8556, -1.4659], zoom: 6 },
};

export function JobMarketMap({ insights, location }: JobMarketMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const mapConfig =
    COUNTRY_MAP_CONFIG[location.country] || COUNTRY_MAP_CONFIG["United States"];

  // Get the tech hubs for the current country
  const techHubs = COUNTRY_TECH_HUBS[location.country] || [];

  // Generate a color for a region based on job count
  const getRegionColor = (regionName: string) => {
    // First check if this is the selected region
    if (regionName === location.state) {
      return "#f43f5e"; // Highlight color for selected region
    }

    // Find job data for this region
    const regionData = insights.locationTrends.find((lt) =>
      lt.location.includes(regionName)
    );

    if (!regionData) return "#27272a";

    // Calculate color based on job count
    const max = Math.max(...insights.locationTrends.map((lt) => lt.jobCount));
    const normalizedValue = regionData.jobCount / max;

    // Generate color from blue to purple based on job count
    const hue = 240 - normalizedValue * 60;
    const saturation = 70 + normalizedValue * 30;
    const lightness = 30 + normalizedValue * 20;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Get region growth rate (simulated based on job count)
  const getRegionGrowth = (regionName: string): number => {
    const regionData = insights.locationTrends.find((lt) =>
      lt.location.includes(regionName)
    );
    if (!regionData) return 0;

    // Find relevant industry growth rates for this region
    const relevantIndustries = insights.industryTrends.slice(0, 3);
    const avgGrowthRate =
      relevantIndustries.reduce(
        (sum, industry) => sum + industry.growthRate,
        0
      ) / relevantIndustries.length;

    return avgGrowthRate;
  };

  // Get dominant industries for a region
  const getRegionIndustries = (regionName: string): string[] => {
    // For demonstration, pull relevant industries from the insights data
    const industries = insights.industryTrends
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 3)
      .map((industry) => industry.industry);

    return industries;
  };

  // Get top role for a region
  const getTopRoleForRegion = (regionName: string) => {
    const roleComps = insights.roleComparison;
    if (roleComps.length === 0) return null;

    // Sort by count to get top role
    const topRole = [...roleComps].sort((a, b) => b.count - a.count)[0];
    return topRole;
  };

  // Style function for GeoJSON regions
  const regionStyle = (feature: any) => {
    const regionName = feature.properties.name;
    return {
      fillColor: getRegionColor(regionName),
      weight: regionName === location.state ? 2 : 1,
      opacity: 1,
      color: regionName === location.state ? "#ffffff" : "#18181b",
      fillOpacity: 0.7,
    };
  };

  // Loading GeoJSON data
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const mapDataUrl =
      COUNTRY_MAP_DATA[location.country] || COUNTRY_MAP_DATA["United States"];

    fetch(mapDataUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load map data: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        setGeoData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(`Error loading map data for ${location.country}:`, error);
        setError(`Could not load map data for ${location.country}`);
        setIsLoading(false);
      });
  }, [location.country]);

  // Calculate marker size based on importance and job count
  const getMarkerSize = (cityData: any) => {
    const regionData = insights.locationTrends.find((lt) =>
      lt.location.includes(cityData.state)
    );

    const baseSize = 4;
    const jobFactor = regionData ? regionData.jobCount / 1000 : 1;
    return baseSize * cityData.importance * (0.5 + jobFactor * 0.5) * 2;
  };

  // Get marker color based on region and specialty
  const getMarkerColor = (cityData: any) => {
    if (cityData.state === location.state) return "#f43f5e";
    if (cityData.specialty) return "#22d3ee";
    return "#ffffff";
  };

  // Get market sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-400";
      case "negative":
        return "text-red-400";
      default:
        return "text-amber-400";
    }
  };

  // Calculate job competition level for a city
  const getCompetitionLevel = (cityData: any) => {
    // Check if we have data about this role in our insights
    const roleData = insights.roleComparison.find((r) =>
      r.role.toLowerCase().includes(cityData.specialty?.toLowerCase() || "")
    );

    return roleData?.competitionLevel || "medium";
  };

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-dark-800">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-dark-800">
        <div className="bg-dark-700 p-4 rounded-lg text-red-400 max-w-md">
          <p className="font-semibold">Map error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px]">
      <MapContainer
        center={mapConfig.center}
        zoom={mapConfig.zoom}
        style={{ height: "100%", width: "100%", backgroundColor: "#1f2937" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {geoData && (
          <GeoJSON
            data={geoData}
            style={regionStyle}
            onEachFeature={(feature, layer) => {
              const regionName = feature.properties.name;
              const regionData = insights.locationTrends.find((lt) =>
                lt.location.includes(regionName)
              );

              if (regionData) {
                // Get additional insight data
                const growthRate = getRegionGrowth(regionName);
                const dominantIndustries = getRegionIndustries(regionName);
                const topRole = getTopRoleForRegion(regionName);

                layer.bindTooltip(
                  `<div class="font-semibold">${regionName}</div>
                  <div class="text-primary-400">${
                    regionData.jobCount
                  } jobs</div>
                  <div class="text-sm text-dark-300">Avg Salary: $${Math.round(
                    regionData.avgSalary / 1000
                  )}k</div>
                  ${
                    growthRate
                      ? `<div class="text-sm text-${
                          growthRate > 0 ? "green" : "red"
                        }-400">Growth: ${growthRate.toFixed(1)}%</div>`
                      : ""
                  }
                  ${
                    topRole
                      ? `<div class="text-sm text-cyan-400">Top Role: ${topRole.role}</div>`
                      : ""
                  }
                  ${
                    dominantIndustries.length > 0
                      ? `<div class="text-xs text-dark-300 mt-1">Key Industries: ${dominantIndustries.join(
                          ", "
                        )}</div>`
                      : ""
                  }
                  <div class="text-xs text-primary-300 mt-1">Remote: ${Math.round(
                    insights.remoteWork.percentage
                  )}% available</div>`,
                  { className: "custom-tooltip" }
                );

                layer.on({
                  mouseover: () => setHoveredRegion(regionName),
                  mouseout: () => setHoveredRegion(null),
                });
              }
            }}
          />
        )}

        {/* Add tech hub markers */}
        {techHubs.map((hub, index) => (
          <CircleMarker
            key={`${hub.city}-${index}`}
            center={[hub.lat, hub.lng]}
            radius={getMarkerSize(hub)}
            pathOptions={{
              fillColor: getMarkerColor(hub),
              color:
                hub.state === location.state
                  ? "#ffffff"
                  : hub.specialty
                  ? "#0891b2"
                  : "transparent",
              weight: 1,
              fillOpacity: 0.7,
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -5]}
              className="custom-tooltip"
            >
              <div className="font-semibold">
                {hub.city}, {hub.state}
              </div>
              {hub.specialty ? (
                <div className="text-cyan-400">Specialty: {hub.specialty}</div>
              ) : (
                <div className="text-primary-400">
                  Tech Hub Rating: {Math.round(hub.importance * 10)}/10
                </div>
              )}

              {insights.locationTrends.find((lt) =>
                lt.location.includes(hub.state)
              ) && (
                <>
                  <div className="text-sm text-dark-300">
                    {location.country === "United States"
                      ? "State"
                      : location.country === "Canada"
                      ? "Province"
                      : "Region"}{" "}
                    Job Count:
                    {
                      insights.locationTrends.find((lt) =>
                        lt.location.includes(hub.state)
                      )?.jobCount
                    }
                  </div>
                  <div className="text-sm text-dark-300">
                    Avg Salary: $
                    {Math.round(
                      (insights.locationTrends.find((lt) =>
                        lt.location.includes(hub.state)
                      )?.avgSalary ?? 0) / 1000
                    )}
                    k
                  </div>

                  {/* Additional detailed insights */}
                  {hub.specialty && (
                    <div className="text-xs mt-1 border-t border-dark-600 pt-1">
                      <div
                        className={getSentimentColor(
                          insights.roleComparison.find((r) =>
                            r.role
                              .toLowerCase()
                              .includes(hub.specialty?.toLowerCase() || "")
                          )?.marketSentiment || "neutral"
                        )}
                      >
                        Market Sentiment:{" "}
                        {insights.roleComparison.find((r) =>
                          r.role
                            .toLowerCase()
                            .includes(hub.specialty?.toLowerCase() || "")
                        )?.marketSentiment || "Neutral"}
                      </div>
                      <div className="text-dark-300">
                        Competition: {getCompetitionLevel(hub)}
                      </div>
                      <div className="text-dark-300">
                        Remote Opportunities:{" "}
                        {Math.round(insights.remoteWork.percentage)}%
                      </div>
                    </div>
                  )}
                </>
              )}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Skills Insights Panel */}
      <div className="absolute top-3 left-3 bg-dark-800/90 p-3 rounded-md text-xs shadow-lg border border-dark-700 backdrop-blur-sm max-w-[200px] z-[1000]">
        <h4 className="text-white font-semibold mb-2">
          {hoveredRegion
            ? `${hoveredRegion} Skills`
            : `${location.state} In-Demand Skills`}
        </h4>
        <div className="space-y-2">
          {insights.topSkills.slice(0, 5).map((skill, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-dark-200">{skill.skill}</span>
                <span
                  className={`text-xs ${
                    skill.trend === "up"
                      ? "text-green-400"
                      : skill.trend === "down"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {skill.trend === "up"
                    ? "↑"
                    : skill.trend === "down"
                    ? "↓"
                    : "→"}
                  {skill.percentage}%
                </span>
              </div>
              <div className="w-full bg-dark-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary-500 h-full rounded-full"
                  style={{ width: `${skill.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-dark-700">
          <div className="flex justify-between">
            <span className="text-dark-300">Skill Gap:</span>
            <span className="text-primary-400">
              {insights.skillGaps.length > 0
                ? Math.round(insights.skillGaps[0].gapScore * 10) / 10
                : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Map Legend - With improved positioning and shadow */}
      <div className="absolute bottom-3 right-3 bg-dark-800/95 p-3 rounded-md text-xs shadow-lg border border-dark-600 backdrop-blur-sm z-[1000] max-w-[200px]">
        <h4 className="text-white font-semibold mb-2 flex items-center justify-between">
          <span>Map Legend</span>
          <span className="text-primary-400 text-[10px]">v1.2</span>
        </h4>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm shadow-red-500/30"></div>
            <span className="text-dark-200">Selected Region</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white shadow-sm shadow-white/30"></div>
            <span className="text-dark-200">Major Tech Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/30"></div>
            <span className="text-dark-200">Specialty Tech Cluster</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-700 rounded shadow-sm shadow-blue-700/30"></div>
            <div className="w-4 h-4 bg-purple-700 rounded shadow-sm shadow-purple-700/30"></div>
            <span className="text-dark-200">Job Density (Low → High)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white shadow-sm shadow-white/30"></div>
            <div className="w-5 h-5 rounded-full bg-white shadow-sm shadow-white/30 ml-[-5px]"></div>
            <span className="text-dark-200">Hub Importance</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-dark-600">
          <div className="text-primary-400 text-xs">
            Click markers for details
          </div>
        </div>
      </div>

      <style>{`
        .custom-tooltip {
          background-color: rgba(31, 41, 55, 0.95) !important;
          border: 1px solid rgba(55, 65, 81, 0.5) !important;
          border-radius: 0.375rem !important;
          color: #f3f4f6 !important;
          backdrop-filter: blur(4px);
          padding: 6px 8px;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
