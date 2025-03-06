import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText, Copy, Check, CopyCheck, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analysisService } from '../../lib/analysisService';
import { debounce, ResourceManager } from '../../lib/utils';
import { FileParser } from '../../lib/fileParser';
import type { Database } from '../../types/supabase';
import { FileUpload } from '../ui/FileUpload';

type ResumeAnalysis = Database['public']['Tables']['resume_analyses']['Row'];

const tailorSchema = z.object({
  resumeText: z.string().min(1, 'Please upload or paste your resume'),
  jobDescription: z.string().min(1, 'Please provide a job description'),
  targetRole: z.string().min(1, 'Please specify your target role'),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']),
});

type TailorFormData = z.infer<typeof tailorSchema>;

const experienceLevels = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (3-5 years)' },
  { value: 'senior', label: 'Senior Level (6-10 years)' },
  { value: 'executive', label: 'Executive Level (10+ years)' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-lg transition-all duration-200 ${
        copied 
          ? 'bg-green-500/20 text-green-400' 
          : 'hover:bg-primary-500/20 text-primary-400 hover:text-primary-300'
      }`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <CopyCheck className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function TailoredSuggestions({ suggestions }: { suggestions: string[] }) {
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = async () => {
    try {
      const text = suggestions.join('\n\n');
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy all text:', err);
    }
  };

  return (
    <div className="bg-dark-800 p-4 sm:p-6 rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Wand2 className="h-5 w-5 text-primary-500 mr-2" />
          Tailored Bullet Points
        </h3>
        <button
          onClick={handleCopyAll}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
            copiedAll 
              ? 'bg-green-500/20 text-green-400' 
              : 'hover:bg-primary-500/20 text-primary-400 hover:text-primary-300'
          }`}
        >
          {copiedAll ? (
            <>
              <Check className="h-4 w-4" />
              <span className="text-sm">Copied All</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span className="text-sm">Copy All</span>
            </>
          )}
        </button>
      </div>
      
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <div 
            key={index}
            className="group p-4 rounded-lg bg-primary-500/10 border border-primary-500/20 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary-500 flex-shrink-0 mt-1" />
              <div className="flex-1 flex justify-between items-start gap-4">
                <p className="text-dark-100">{suggestion}</p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={suggestion} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResumeTailor() {
  const [isLoading, setIsLoading] = useState(false);
  const [tailoredSuggestions, setTailoredSuggestions] = useState<string[]>([]);
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

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<TailorFormData>({
    resolver: zodResolver(tailorSchema),
    defaultValues: {
      experienceLevel: 'mid',
    },
  });

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

  const tailorResume = async (data: TailorFormData) => {
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

      setTailoredSuggestions(result.suggestions);

      const { error: dbError } = await supabase
        .from('resume_analyses')
        .insert({
          user_id: user.id,
          resume_text: data.resumeText,
          job_description: data.jobDescription,
          matching_skills: [],
          missing_skills: [],
          score: 100,
          suggestions: result.suggestions,
        });

      if (dbError) throw dbError;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error tailoring resume:', error);
      setError('Failed to tailor resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedTailor = useCallback(
    debounce((data: TailorFormData) => tailorResume(data), 500),
    []
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">Resume Tailor</h1>
      
      <form ref={formRef} onSubmit={handleSubmit(debouncedTailor)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Target Role
            </label>
            <input
              type="text"
              {...register('targetRole')}
              className="input"
              placeholder="e.g., Senior Software Engineer"
            />
            {errors.targetRole && (
              <p className="mt-1 text-sm text-red-400">{errors.targetRole.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Experience Level
            </label>
            <select
              {...register('experienceLevel')}
              className="input"
            >
              {experienceLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            {errors.experienceLevel && (
              <p className="mt-1 text-sm text-red-400">{errors.experienceLevel.message}</p>
            )}
          </div>

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
                  <p className="mt-1 text-sm text-red-400">{errors.resumeText.message}</p>
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
                  <p className="mt-1 text-sm text-red-400">{errors.jobDescription.message}</p>
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
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Tailor Resume
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {tailoredSuggestions.length > 0 && (
        <div className="mt-8">
          <TailoredSuggestions suggestions={tailoredSuggestions} />
        </div>
      )}
    </div>
  );
}