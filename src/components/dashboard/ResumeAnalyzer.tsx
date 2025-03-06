import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Loader2, CheckCircle2, XCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { WordCloud } from '../WordCloud';
import { analysisService } from '../../lib/analysisService';
import { debounce, ResourceManager } from '../../lib/utils';
import { FileParser } from '../../lib/fileParser';
import type { Database } from '../../types/supabase';
import { FileUpload } from '../ui/FileUpload';

type ResumeAnalysis = Database['public']['Tables']['resume_analyses']['Row'];

const analysisSchema = z.object({
  resumeText: z.string().min(1, 'Please upload or paste your resume'),
  jobDescription: z.string().min(1, 'Please provide a job description'),
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
          const isSkillsSection = section.toLowerCase().includes('skills') || 
                                section.toLowerCase().includes('expertise') ||
                                section.toLowerCase().includes('experience');
          
          const isImprovementSection = section.toLowerCase().includes('improve') || 
                                     section.toLowerCase().includes('consider') ||
                                     section.toLowerCase().includes('recommend');

          const icon = isSkillsSection ? (
            <CheckCircle2 className="h-5 w-5 text-primary-500 flex-shrink-0" />
          ) : isImprovementSection ? (
            <XCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          ) : null;

          const sectionClass = isSkillsSection ? 'bg-primary-500/10 border-primary-500/20' :
                             isImprovementSection ? 'bg-amber-500/10 border-amber-500/20' :
                             'bg-dark-700 border-dark-600';

          return (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${sectionClass} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex gap-3">
                {icon && (
                  <div className="mt-1">
                    {icon}
                  </div>
                )}
                <div>
                  {section.split('\n').map((paragraph, pIndex) => (
                    <p 
                      key={pIndex}
                      className={`${pIndex > 0 ? 'mt-2' : ''} text-dark-100`}
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
  const { user } = useAuth();
  const abortController = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      ResourceManager.cleanup();
    };
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<AnalysisFormData>({
    resolver: zodResolver(analysisSchema),
  });

  const currentResumeText = watch('resumeText');
  const currentJobDescription = watch('jobDescription');

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setFileError(null);
      const text = await FileParser.parseFile(file);
      setValue('resumeText', text);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeResume = async (data: AnalysisFormData) => {
    if (!user) {
      console.error('No user found');
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const result = await analysisService.analyzeResume(
        data.resumeText,
        data.jobDescription,
        abortController.current.signal
      );

      if (abortController.current?.signal.aborted) {
        return;
      }

      setAiAnalysis(result.geminiAnalysis);

      const { data: analysisData, error: dbError } = await supabase
        .from('resume_analyses')
        .insert({
          user_id: user.id,
          resume_text: data.resumeText,
          job_description: data.jobDescription,
          matching_skills: result.matchingSkills,
          missing_skills: result.missingSkills,
          score: result.score,
          suggestions: result.suggestions,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setAnalysis(analysisData);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error analyzing resume:', error);
      setError('Failed to analyze resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAnalysis = useCallback(() => {
    if (currentResumeText && currentJobDescription) {
      analyzeResume({ resumeText: currentResumeText, jobDescription: currentJobDescription });
    }
  }, [currentResumeText, currentJobDescription]);

  const debouncedAnalyze = useCallback(
    debounce((data: AnalysisFormData) => analyzeResume(data), 500),
    []
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">Resume Analyzer</h1>
      
      <form ref={formRef} onSubmit={handleSubmit(debouncedAnalyze)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Upload Resume
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex-1">
                <textarea
                  {...register('resumeText')}
                  className="input min-h-[200px]"
                  placeholder="Paste your resume text here..."
                />
                {errors.resumeText && (
                  <p className="mt-1 text-sm text-red-500">{errors.resumeText.message}</p>
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
                  {...register('jobDescription')}
                  className="input min-h-[200px]"
                  placeholder="Paste the job description here..."
                />
                {errors.jobDescription && (
                  <p className="mt-1 text-sm text-red-500">{errors.jobDescription.message}</p>
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
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto btn-primary"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                {fileError ? 'Processing File...' : 'Analyzing...'}
              </>
            ) : (
              'Analyze Resume'
            )}
          </button>

          {analysis && (
            <button
              type="button"
              onClick={handleRefreshAnalysis}
              disabled={isLoading}
              className="flex items-center px-3 py-2 text-sm text-primary-400 hover:text-primary-300"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
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
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Analysis Results</h2>
            
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">Match Score</span>
                <span className={`text-lg font-semibold ${
                  analysis.score >= 70 ? 'text-green-400' :
                  analysis.score >= 50 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {Math.round(analysis.score)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    analysis.score >= 70 ? 'bg-green-500' :
                    analysis.score >= 50 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-white mb-3">Skills Analysis</h3>
              <div className="h-[300px] sm:h-[400px] w-full bg-dark-900 rounded-lg p-4">
                <WordCloud
                  words={[
                    ...analysis.matching_skills.map(skill => ({
                      text: skill,
                      value: 30,
                      category: 'match' as const,
                    })),
                    ...analysis.missing_skills.map(skill => ({
                      text: skill,
                      value: 20,
                      category: 'missing' as const,
                    })),
                  ]}
                />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                  <span className="text-sm text-dark-300">Matching Skills ({analysis.matching_skills.length})</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                  <span className="text-sm text-dark-300">Missing Skills ({analysis.missing_skills.length})</span>
                </div>
              </div>
            </div>

            {aiAnalysis && (
              <AIAnalysisSection analysis={aiAnalysis} />
            )}

            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-3">Key Recommendations</h3>
              <ul className="space-y-3">
                {analysis.suggestions.slice(1).map((suggestion, index) => (
                  <li key={index} className="flex items-start p-3 bg-primary-500/10 rounded-lg">
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