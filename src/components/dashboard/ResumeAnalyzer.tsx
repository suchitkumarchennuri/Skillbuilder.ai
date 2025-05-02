import React, { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  CopyCheck,
  Wand2,
  Settings,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { WordCloud } from "../WordCloud";
import { analysisService } from "../../lib/analysisService";
import { debounce, ResourceManager } from "../../lib/utils";
import { FileParser } from "../../lib/fileParser";
import type { Database } from "../../types/supabase";
import { FileUpload } from "../ui/FileUpload";

type ResumeAnalysis = Database["public"]["Tables"]["resume_analyses"]["Row"];

const analysisSchema = z.object({
  resumeText: z.string().min(1, "Please upload or paste your resume"),
  jobDescription: z.string().min(1, "Please provide a job description"),
});

type AnalysisFormData = z.infer<typeof analysisSchema>;

function AIAnalysisSection({ analysis }: { analysis: string }) {
  const sections = analysis.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="bg-dark-800 p-4 sm:p-6 rounded-lg shadow-lg space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center">
        <AlertCircle className="h-5 w-5 text-primary-500 mr-2" />
        AI Analysis
      </h3>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const isSkillsSection =
            section.toLowerCase().includes("skills") ||
            section.toLowerCase().includes("expertise") ||
            section.toLowerCase().includes("experience");

          const isImprovementSection =
            section.toLowerCase().includes("improve") ||
            section.toLowerCase().includes("consider") ||
            section.toLowerCase().includes("recommend");

          const icon = isSkillsSection ? (
            <CheckCircle2 className="h-5 w-5 text-primary-500 flex-shrink-0" />
          ) : isImprovementSection ? (
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          ) : null;

          const sectionClass = isSkillsSection
            ? "bg-primary-500/10 border-primary-500/20"
            : isImprovementSection
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-dark-700 border-dark-600";

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${sectionClass} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex gap-3">
                {icon && <div className="mt-1">{icon}</div>}
                <div>
                  {section.split("\n").map((paragraph, pIndex) => (
                    <p
                      key={pIndex}
                      className={`${pIndex > 0 ? "mt-2" : ""} text-dark-100`}
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResumeAnalyzer() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingTooLong, setLoadingTooLong] = useState(false);
  const { user } = useAuth();
  const abortController = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if required API keys are available
  const isServiceAvailable = Boolean(import.meta.env.VITE_OPENROUTER_API_KEY);

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      ResourceManager.cleanup();
    };
  }, []);

  // Add effect to track long-running loading states
  useEffect(() => {
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
  });

  const currentResumeText = watch("resumeText");
  const currentJobDescription = watch("jobDescription");

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setFileError(null);
      const text = await FileParser.parseFile(file);
      setValue("resumeText", text);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Failed to parse file"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeResume = async (data: AnalysisFormData) => {
    if (!user) {
      console.error("No user found");
      setError("You must be logged in to analyze your resume");
      return;
    }

    if (!isServiceAvailable) {
      setError(
        "Resume analysis service is currently unavailable. Please try again later."
      );
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      console.log("Starting resume analysis...");
      const result = await analysisService.analyzeResume(
        data.resumeText,
        data.jobDescription,
        abortController.current.signal
      );

      if (abortController.current?.signal.aborted) {
        return;
      }

      console.log("Analysis results:", {
        matchingSkills: result.matchingSkills.length,
        missingSkills: result.missingSkills.length,
        score: result.score,
        suggestionsCount: result.suggestions.length,
      });

      setAiAnalysis(result.geminiAnalysis);

      // Step 1: Ensure the user exists in the database
      console.log("Verifying user record exists...");
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.log("User record check failed", userError);
        // Create user record if it doesn't exist
        const { error: createUserError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "unknown@example.com",
          full_name: user.user_metadata?.full_name || "User",
        });

        if (createUserError) {
          console.error("Failed to create user record", createUserError);
          throw new Error(
            "Failed to create required user record. Please try signing out and in again."
          );
        }
      }

      // Step 2: Prepare resume analysis data
      console.log("Saving analysis to database...");
      const analysisData = {
        user_id: user.id,
        resume_text: data.resumeText,
        job_description: data.jobDescription,
        matching_skills: result.matchingSkills,
        missing_skills: result.missingSkills,
        score: result.score,
        suggestions: result.suggestions,
      };

      // Step 3: Try database operations with multiple fallbacks
      console.log("Attempting database insert...");
      let savedAnalysis = null;

      // Try inserting first
      try {
        const { data: insertResult, error: insertError } = await supabase
          .from("resume_analyses")
          .insert(analysisData)
          .select()
          .single();

        if (!insertError && insertResult) {
          console.log("Insert succeeded", insertResult);
          savedAnalysis = insertResult;
        } else {
          // If insert fails, try to update existing record
          console.log("Insert failed, trying update", insertError);

          const { data: updateResult, error: updateError } = await supabase
            .from("resume_analyses")
            .update({
              resume_text: data.resumeText,
              job_description: data.jobDescription,
              matching_skills: result.matchingSkills,
              missing_skills: result.missingSkills,
              score: result.score,
              suggestions: result.suggestions,
            })
            .eq("user_id", user.id)
            .select()
            .single();

          if (!updateError && updateResult) {
            console.log("Update succeeded", updateResult);
            savedAnalysis = updateResult;
          } else {
            // If both insert and update fail, try to fetch any existing record
            console.log(
              "Update failed too, trying to fetch existing",
              updateError
            );

            const { data: existingAnalysis, error: fetchError } = await supabase
              .from("resume_analyses")
              .select()
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (!fetchError && existingAnalysis) {
              console.log(
                "Found existing analysis to display",
                existingAnalysis
              );

              // Update the existing analysis with new data but don't wait for result
              (async () => {
                try {
                  await supabase
                    .from("resume_analyses")
                    .update({
                      resume_text: data.resumeText,
                      job_description: data.jobDescription,
                      matching_skills: result.matchingSkills,
                      missing_skills: result.missingSkills,
                      score: result.score,
                      suggestions: result.suggestions,
                    })
                    .eq("id", existingAnalysis.id);
                  console.log("Background update completed");
                } catch (err) {
                  console.error("Background update failed", err);
                }
              })();

              savedAnalysis = {
                ...existingAnalysis,
                matching_skills: result.matchingSkills,
                missing_skills: result.missingSkills,
                score: result.score,
                suggestions: result.suggestions,
              };
            } else {
              // If all DB operations fail, still show analysis but with warning
              console.error(
                "All database operations failed, using in-memory result",
                fetchError
              );
              setError(
                "Analysis completed but could not be saved to the database. Results are temporary."
              );

              // Create a fake saved analysis from the result
              savedAnalysis = {
                id: crypto.randomUUID(),
                user_id: user.id,
                resume_text: data.resumeText,
                job_description: data.jobDescription,
                matching_skills: result.matchingSkills,
                missing_skills: result.missingSkills,
                score: result.score,
                suggestions: result.suggestions,
                created_at: new Date().toISOString(),
              };
            }
          }
        }
      } catch (dbError) {
        console.error("Database operation failed", dbError);

        // Final fallback - create an in-memory analysis result
        savedAnalysis = {
          id: crypto.randomUUID(),
          user_id: user.id,
          resume_text: data.resumeText,
          job_description: data.jobDescription,
          matching_skills: result.matchingSkills,
          missing_skills: result.missingSkills,
          score: result.score,
          suggestions: result.suggestions,
          created_at: new Date().toISOString(),
        };

        setError(
          "Analysis completed but could not be saved to the database. Results are temporary."
        );
      }

      console.log("Final analysis to display:", {
        id: savedAnalysis.id,
        skillsCount: {
          matching: savedAnalysis.matching_skills.length,
          missing: savedAnalysis.missing_skills.length,
        },
      });

      setAnalysis(savedAnalysis);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Error analyzing resume:", error);
      setError("Failed to analyze resume. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAnalysis = () => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    setIsLoading(false);
    setLoadingTooLong(false);
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setError(
      "Analysis was cancelled. The resume analysis was taking too long to complete."
    );
  };

  const handleRefreshAnalysis = useCallback(() => {
    if (currentResumeText && currentJobDescription) {
      analyzeResume({
        resumeText: currentResumeText,
        jobDescription: currentJobDescription,
      });
    }
  }, [currentResumeText, currentJobDescription]);

  const debouncedAnalyze = useCallback(
    debounce((data: AnalysisFormData) => analyzeResume(data), 500),
    []
  );

  if (!isServiceAvailable) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-6 w-6 text-primary-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Resume Analyzer
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
                The Resume Analyzer requires additional configuration. Please
                add the following to your .env file:
              </p>
              <pre className="mt-2 p-3 bg-dark-900 rounded-lg text-sm font-mono">
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
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">
        Resume Analyzer
      </h1>

      <form
        ref={formRef}
        onSubmit={handleSubmit(debouncedAnalyze)}
        className="space-y-6"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Upload Resume
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex-1">
                <textarea
                  {...register("resumeText")}
                  className="input min-h-[200px]"
                  placeholder="Paste your resume text here..."
                />
                {errors.resumeText && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.resumeText.message}
                  </p>
                )}
              </div>
              <div>
                <FileUpload
                  onFileSelect={handleFileUpload}
                  label="Upload Resume"
                  description="Drag and drop your resume here or click to browse"
                />
                {fileError && (
                  <p className="mt-1 text-sm text-red-500">{fileError}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Job Description
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex-1">
                <textarea
                  {...register("jobDescription")}
                  className="input min-h-[200px]"
                  placeholder="Paste the job description here..."
                />
                {errors.jobDescription && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.jobDescription.message}
                  </p>
                )}
              </div>
              <div>
                <FileUpload
                  onFileSelect={(file) => handleFileUpload(file)}
                  label="Upload Job Description"
                  description="Drag and drop the job description here or click to browse"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {loadingTooLong && isLoading ? (
            <div className="w-full">
              <div className="flex items-center bg-amber-500/10 text-amber-400 p-3 rounded-lg mb-3">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    Analysis is taking longer than expected. This could be due
                    to high server load or complex resume content.
                  </p>
                </div>
              </div>
              <div className="flex justify-between gap-3">
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
              className="w-full sm:w-auto btn-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  {fileError ? "Processing File..." : "Analyzing..."}
                </>
              ) : (
                "Analyze Resume"
              )}
            </button>
          )}

          {analysis && !isLoading && (
            <button
              type="button"
              onClick={handleRefreshAnalysis}
              disabled={isLoading}
              className="flex items-center px-3 py-2 text-sm text-primary-400 hover:text-primary-300"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh Analysis
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-8 space-y-6">
          <div className="bg-dark-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">
              Analysis Results
            </h2>

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">
                  Match Score
                </span>
                <span
                  className={`text-lg font-semibold ${
                    analysis.score >= 70
                      ? "text-green-400"
                      : analysis.score >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {Math.round(analysis.score)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    analysis.score >= 70
                      ? "bg-green-500"
                      : analysis.score >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-3">
                Skills Analysis
              </h3>
              <div className="h-[300px] sm:h-[400px] w-full bg-dark-900 rounded-lg p-4">
                <WordCloud
                  words={[
                    ...analysis.matching_skills.map((skill) => ({
                      text: skill,
                      value: 30,
                      category: "match" as const,
                    })),
                    ...analysis.missing_skills.map((skill) => ({
                      text: skill,
                      value: 20,
                      category: "missing" as const,
                    })),
                  ]}
                />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                  <span className="text-sm text-dark-300">
                    Matching Skills ({analysis.matching_skills.length})
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                  <span className="text-sm text-dark-300">
                    Missing Skills ({analysis.missing_skills.length})
                  </span>
                </div>
              </div>
            </div>

            {aiAnalysis && <AIAnalysisSection analysis={aiAnalysis} />}

            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-3">
                Key Recommendations
              </h3>
              <ul className="space-y-3">
                {analysis.suggestions.slice(1).map((suggestion, index) => (
                  <li
                    key={index}
                    className="flex items-start p-3 bg-primary-500/10 rounded-lg"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-dark-200">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
