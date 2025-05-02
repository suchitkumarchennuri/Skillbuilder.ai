import React, { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserCircle,
  Briefcase,
  Users,
  RefreshCw,
  Settings,
  FileText,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  analyzeLinkedInProfile,
  clearProfileCache,
  isLinkedInAnalysisConfigured,
  formatForDatabase,
} from "../../lib/linkedinAnalysis";
import { debounce } from "../../lib/utils";
import type { LinkedInAnalysis, ProfileSuggestion } from "../../types";

// Debug flag to help diagnose issues
const DEBUG = true;

// Logger function
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[LinkedIn Analyzer] ${message}`, data || "");
  }
};

const linkedInSchema = z.object({
  profileUrl: z
    .string()
    .url("Please enter a valid URL")
    .regex(/linkedin\.com\/in\//i, "Please enter a valid LinkedIn profile URL"),
});

type LinkedInFormData = z.infer<typeof linkedInSchema>;

// Map section types to icons
const sectionIcons = {
  profile: UserCircle,
  experience: Briefcase,
  network: Users,
  skills: FileText,
  education: CheckCircle2,
} as const;

// Verify the linkedin_analyses table has the right structure
async function verifyTableStructure() {
  try {
    log("Verifying linkedin_analyses table structure");

    // Check if the table exists by querying it
    const { error: tableCheckError } = await supabase
      .from("linkedin_analyses")
      .select("id")
      .limit(1);

    if (tableCheckError) {
      log("Table does not exist or has issues", tableCheckError);
      return false;
    }

    log("Table exists, continuing");
    return true;
  } catch (err) {
    log("Error verifying table structure", err);
    return false;
  }
}

export function LinkedInAnalyzer() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<
    "idle" | "fetching" | "analyzing" | "processing"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const { user } = useAuth();
  const abortController = React.useRef<AbortController | null>(null);
  const loadingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  log("Component initialized", { user: user?.id });

  // Verify table structure on component mount
  React.useEffect(() => {
    verifyTableStructure();
  }, []);

  // Add effect to track long-running loading states
  React.useEffect(() => {
    if (isLoading) {
      setLoadingTooLong(false);
      loadingTimerRef.current = setTimeout(() => {
        setLoadingTooLong(true);
      }, 45000); // Show warning after 45 seconds
    } else {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }

    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [isLoading]);

  React.useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LinkedInFormData>({
    resolver: zodResolver(linkedInSchema),
  });

  const currentProfileUrl = watch("profileUrl");

  // Check if service is properly configured
  const isServiceAvailable = isLinkedInAnalysisConfigured();
  log("Service availability check", { isServiceAvailable });

  // Skip slow analysis if we already have a recent analysis
  const checkExistingAnalysis = useCallback(
    async (profileUrl: string) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("linkedin_analyses")
          .select()
          .eq("user_id", user.id)
          .eq("profile_url", profileUrl)
          .single();

        if (!error && data) {
          // Check if analysis is recent (less than 7 days old)
          const analysisDate = new Date(data.created_at);
          const daysSinceAnalysis =
            (Date.now() - analysisDate.getTime()) / (1000 * 3600 * 24);

          if (daysSinceAnalysis < 7) {
            log("Found recent analysis, using cached version", {
              profile: profileUrl,
              age: Math.round(daysSinceAnalysis * 10) / 10 + " days",
            });
            return data;
          }
        }
      } catch (err) {
        log("Error checking for existing analysis", err);
      }

      return null;
    },
    [user]
  );

  const onSubmit = useCallback(
    async (data: LinkedInFormData) => {
      if (!user) {
        setError("You must be logged in to analyze profiles");
        return;
      }

      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setStage("idle"); // Reset stage

      // Update the timeout
      const analysisTimeout = setTimeout(() => {
        if (isLoading && abortController.current) {
          abortController.current.abort();
          setError("Analysis took too long. Please try again.");
          setIsLoading(false);
          setStage("idle");
        }
      }, 30000); // 30 seconds max (longer than individual API timeouts to account for both operations)

      try {
        // Reset progress
        setProgress(10);

        // Check for existing recent analysis first
        setStage("fetching");
        let existingAnalysis = null;

        try {
          existingAnalysis = await checkExistingAnalysis(data.profileUrl);
          setProgress(25);
        } catch (checkError) {
          log(
            "Error checking for existing analysis, continuing with new analysis",
            checkError
          );
          // Don't throw, just continue with new analysis
        }

        if (existingAnalysis) {
          clearTimeout(analysisTimeout);
          setAnalysis({
            id: existingAnalysis.id,
            userId: existingAnalysis.user_id,
            profileUrl: existingAnalysis.profile_url,
            profileScore: existingAnalysis.profile_score,
            suggestions: existingAnalysis.suggestions || [],
            strengths: existingAnalysis.strengths || [],
            weaknesses: existingAnalysis.weaknesses || [],
            createdAt: existingAnalysis.created_at,
          });
          setProgress(100);
          setIsLoading(false);
          setStage("idle");
          return;
        }

        log("Starting LinkedIn profile analysis...", {
          profileUrl: data.profileUrl,
        });

        // Visual indication of progress
        setProgress(30);

        // Now fetching profile data (this happens inside analyzeLinkedInProfile)
        setStage("fetching");

        // Use a timer to update progress during API calls
        let progressInterval = setInterval(() => {
          setProgress((prev) => {
            // Update progress but don't complete until done
            if (prev < 80) {
              return prev + 2;
            }
            return prev;
          });
        }, 500);

        // Continue with analysis
        setStage("analyzing");

        let result;
        try {
          result = await analyzeLinkedInProfile(
            data.profileUrl,
            abortController.current.signal
          );

          // Analysis completed!
          clearInterval(progressInterval);
          setProgress(90);
        } catch (analysisError) {
          clearTimeout(analysisTimeout);
          clearInterval(progressInterval);
          log("Error during LinkedIn profile analysis", analysisError);

          if (analysisError instanceof Error) {
            if (
              analysisError.name === "AbortError" ||
              abortController.current?.signal.aborted
            ) {
              setError("Analysis was cancelled or timed out");
            } else {
              setError(analysisError.message || "Failed to analyze profile");
            }
          } else {
            setError("An unknown error occurred during analysis");
          }

          setIsLoading(false);
          setStage("idle");
          setProgress(0);
          return;
        }

        // After analysis is complete, clear the timeout
        clearTimeout(analysisTimeout);

        // Final processing stage
        setStage("processing");
        setProgress(95);

        // Log the analysis result
        log("Analysis completed", {
          score: result.score,
          suggestions: result.suggestions.length,
          strengths: result.strengths?.length || 0,
          weaknesses: result.weaknesses?.length || 0,
        });

        // Ensure we have the key experience suggestions
        const criticalSuggestions: ProfileSuggestion[] = [
          {
            section: "experience" as const,
            suggestion:
              "Add specific projects worked on, detailing the technologies used, challenges overcome, and results achieved.",
            priority: "high" as const,
          },
          {
            section: "experience" as const,
            suggestion:
              "Quantify accomplishments with metrics such as performance improvements, cost savings, or efficiency gains.",
            priority: "high" as const,
          },
          {
            section: "experience" as const,
            suggestion:
              "Provide more context on the industries or domains worked in to showcase versatility and adaptability in different environments.",
            priority: "medium" as const,
          },
        ];

        // Combine existing suggestions with critical ones, avoiding duplicates
        const enhancedSuggestions = [...result.suggestions];

        // Check if each critical suggestion already exists (using substring matching)
        for (const criticalSuggestion of criticalSuggestions) {
          const alreadyExists = result.suggestions.some(
            (s) =>
              s.section === "experience" &&
              (s.suggestion.includes("specific projects") ||
                s.suggestion.includes("technologies used") ||
                s.suggestion.includes("Quantify") ||
                s.suggestion.includes("metrics") ||
                s.suggestion.includes("industries") ||
                s.suggestion.includes("domains"))
          );

          if (!alreadyExists) {
            enhancedSuggestions.push(criticalSuggestion);
          }
        }

        // Use the enhanced suggestions for display
        result.suggestions = enhancedSuggestions;

        // IMMEDIATELY display results to user regardless of database status
        const tempAnalysis = {
          id: "temp-analysis-" + Date.now(),
          userId: user.id,
          profileUrl: data.profileUrl,
          profileScore: result.score,
          suggestions: result.suggestions,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          createdAt: new Date().toISOString(),
        };

        // Set the analysis state so user sees results right away
        setAnalysis({
          id: tempAnalysis.id,
          userId: tempAnalysis.userId,
          profileUrl: tempAnalysis.profileUrl,
          profileScore: tempAnalysis.profileScore,
          suggestions: tempAnalysis.suggestions,
          strengths: tempAnalysis.strengths,
          weaknesses: tempAnalysis.weaknesses,
          createdAt: tempAnalysis.createdAt,
        });

        // Mark loading as complete since results are displayed
        setProgress(100);
        setIsLoading(false);
        setStage("idle");

        // Now try to save to database in background without blocking the UI
        setTimeout(() => {
          saveToDatabase(user, data.profileUrl, result).catch((error) => {
            log(
              "Database save failed, but results are already displayed",
              error
            );
            // No need to show error to user since they already have results
          });
        }, 100);
      } catch (err) {
        // This is the final catch-all for any unexpected errors
        clearTimeout(analysisTimeout);
        console.error("Unexpected error:", err);
        log("Unexpected error in analysis process", err);

        if (err instanceof Error) {
          setError(`Unexpected error: ${err.message}`);
        } else {
          setError("An unexpected error occurred");
        }

        setIsLoading(false);
        setStage("idle");
        setProgress(0);
      }
    },
    [user, checkExistingAnalysis, isLoading]
  );

  // Separate function to handle database operations
  const saveToDatabase = async (user: any, profileUrl: string, result: any) => {
    try {
      // Step 1: Ensure the user exists in the database
      log("Verifying user record exists...");
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (userError) {
        log("User record check failed", userError);
        // Create user record if it doesn't exist
        const { error: createUserError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "unknown@example.com",
          full_name: user.user_metadata?.full_name || "User",
        });

        if (createUserError) {
          log("Failed to create user record", createUserError);
          throw new Error("Failed to create user record");
        }
      }

      // Format data properly for database
      const formattedData = formatForDatabase(result);
      console.log("Formatted data for database:", formattedData);

      // Attempt direct upsert first (most reliable method)
      log("Attempting upsert operation");
      const { data: upsertResult, error: upsertError } = await supabase
        .from("linkedin_analyses")
        .upsert(
          {
            user_id: user.id,
            profile_url: profileUrl,
            profile_score: formattedData.profile_score,
            // Use the stringified versions for Supabase
            suggestions: formattedData.suggestions_json,
            strengths: formattedData.strengths_json,
            weaknesses: formattedData.weaknesses_json,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,profile_url",
          }
        );

      if (!upsertError) {
        log("Database save successful via upsert");
        return upsertResult;
      }

      log("Upsert failed, trying insert", upsertError);

      // Try direct insert if upsert fails
      const { data: insertResult, error: insertError } = await supabase
        .from("linkedin_analyses")
        .insert({
          user_id: user.id,
          profile_url: profileUrl,
          profile_score: formattedData.profile_score,
          suggestions: formattedData.suggestions_json,
          strengths: formattedData.strengths_json,
          weaknesses: formattedData.weaknesses_json,
        });

      if (!insertError) {
        log("Direct insert successful");
        return insertResult;
      }

      // If still failing, try one more method with explicit JSON casting
      log("Insert failed, trying one more approach", insertError);
      try {
        // Use raw SQL via RPC as last resort
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "insert_linkedin_analysis",
          {
            p_user_id: user.id,
            p_profile_url: profileUrl,
            p_profile_score: formattedData.profile_score,
            p_suggestions: formattedData.suggestions_json,
            p_strengths: formattedData.strengths_json,
            p_weaknesses: formattedData.weaknesses_json,
          }
        );

        if (!rpcError) {
          log("Database save successful via RPC", rpcResult);
          return rpcResult;
        }

        log("RPC approach failed as well", rpcError);
      } catch (err) {
        log("Final approach failed", err);
      }

      // If all operations fail, log the errors
      log("All database operations failed");
      console.error("Database save failed after multiple attempts:", {
        upsertError,
        insertError,
      });

      // Not throwing an error here since we don't want to disrupt UI
      return null;
    } catch (err) {
      log("Database operation failed", err);
      // Not throwing to avoid disrupting the UI
      return null;
    }
  };

  const handleRefreshAnalysis = useCallback(() => {
    if (currentProfileUrl) {
      log("Refreshing analysis", { profileUrl: currentProfileUrl });
      clearProfileCache(currentProfileUrl);
      onSubmit({ profileUrl: currentProfileUrl });
    }
  }, [currentProfileUrl, onSubmit]);

  const debouncedSubmit = debounce(onSubmit, 300);

  const cancelAnalysis = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    setIsLoading(false);
    setLoadingTooLong(false);
    setStage("idle");
    setProgress(0);

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }

    setError(
      "Analysis was cancelled. The LinkedIn profile analysis was taking too long to complete."
    );
  };

  if (!isServiceAvailable) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-6 w-6 text-primary-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            LinkedIn Analyzer
          </h1>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 text-dark-200">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-500">
                Service Configuration Required
              </p>
              <p className="mt-1">
                The LinkedIn Analyzer requires additional configuration. Please
                add the following to your .env file:
              </p>
              <pre className="mt-2 p-3 bg-dark-900 rounded-lg text-sm font-mono">
                VITE_RAPIDAPI_KEY=your_api_key_here{"\n"}
                VITE_OPENROUTER_API_KEY=your_api_key_here
              </pre>
              <p className="mt-2">
                Contact your administrator or check the documentation for more
                information.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 -mt-4 pt-4 pb-4 bg-dark-950">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          LinkedIn Profile Analyzer
        </h1>
      </div>

      <form onSubmit={handleSubmit(debouncedSubmit)} className="space-y-6 mt-6">
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">
            LinkedIn Profile URL
          </label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="url"
                {...register("profileUrl")}
                className="input"
                placeholder="https://www.linkedin.com/in/your-profile"
              />
              {errors.profileUrl && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.profileUrl.message}
                </p>
              )}
            </div>
            {loadingTooLong && isLoading ? (
              <div className="flex-1 sm:flex-initial space-y-3">
                <div className="flex items-center bg-amber-500/10 text-amber-400 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">
                      Analysis is taking longer than expected. This could be due
                      to high server load.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelAnalysis}
                    className="flex-1 btn-outline"
                  >
                    Cancel Analysis
                  </button>
                  <button type="button" disabled className="flex-1 btn-primary">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Still Analyzing...
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {stage === "fetching"
                      ? "Fetching Profile..."
                      : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Analyze Profile
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {isLoading && (
        <div className="mt-4 p-4 bg-dark-800/50 border border-primary-500/20 rounded-lg">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4 text-primary-400" />
              <p className="text-primary-400 text-sm font-medium">
                {stage === "fetching"
                  ? "Fetching LinkedIn profile data..."
                  : stage === "analyzing"
                  ? "Analyzing profile with AI..."
                  : stage === "processing"
                  ? "Processing results..."
                  : "Loading..."}
              </p>
            </div>
            <div className="h-1 w-full bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-1 bg-primary-500 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
            <p className="text-xs text-dark-400 mt-1">
              {stage === "fetching" && progress < 30
                ? "Checking for existing analyses..."
                : stage === "fetching" && progress >= 30
                ? "Retrieving profile from LinkedIn..."
                : stage === "analyzing"
                ? "AI is analyzing your profile (this may take 10-15 seconds)..."
                : stage === "processing"
                ? "Preparing your results..."
                : "Almost done..."}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-8 space-y-6">
          <div className="bg-dark-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                Analysis Results
              </h2>
              <button
                onClick={handleRefreshAnalysis}
                disabled={isLoading}
                className="flex items-center text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh Analysis
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">
                  Profile Score
                </span>
                <span
                  className={`text-lg font-semibold ${
                    analysis.profileScore >= 70
                      ? "text-green-400"
                      : analysis.profileScore >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {Math.round(analysis.profileScore)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    analysis.profileScore >= 70
                      ? "bg-green-500"
                      : analysis.profileScore >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${analysis.profileScore}%` }}
                />
              </div>
            </div>

            {/* Profile Strengths Section */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-white mb-3">
                  Profile Strengths
                </h3>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-dark-100">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Profile Weaknesses Section */}
            {analysis.weaknesses && analysis.weaknesses.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-white mb-3">
                  Areas for Improvement
                </h3>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-dark-100">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {analysis.suggestions.map(
                (suggestion: ProfileSuggestion, index: number) => {
                  const Icon = sectionIcons[suggestion.section];
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                        suggestion.priority === "high"
                          ? "bg-red-500/10 border-red-500/20"
                          : suggestion.priority === "medium"
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-green-500/10 border-green-500/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 ${
                            suggestion.priority === "high"
                              ? "text-red-400"
                              : suggestion.priority === "medium"
                              ? "text-amber-400"
                              : "text-green-400"
                          }`}
                        />
                        <div>
                          <p className="text-dark-100">
                            {suggestion.suggestion}
                          </p>
                          <p className="text-sm text-dark-400 mt-1 capitalize">
                            {suggestion.section}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
