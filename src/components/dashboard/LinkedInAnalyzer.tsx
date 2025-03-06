import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, AlertCircle, UserCircle, Briefcase, Users, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeLinkedInProfile, clearProfileCache } from '../../lib/linkedinAnalysis';
import { debounce } from '../../lib/utils';
import type { LinkedInAnalysis, ProfileSuggestion } from '../../types';

const linkedInSchema = z.object({
  profileUrl: z.string()
    .url('Please enter a valid URL')
    .regex(/linkedin\.com\/in\//i, 'Please enter a valid LinkedIn profile URL')
});

type LinkedInFormData = z.infer<typeof linkedInSchema>;

// Map section types to icons
const sectionIcons = {
  profile: UserCircle,
  experience: Briefcase,
  network: Users,
} as const;

export function LinkedInAnalyzer() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const abortController = React.useRef<AbortController | null>(null);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LinkedInFormData>({
    resolver: zodResolver(linkedInSchema)
  });

  const currentProfileUrl = watch('profileUrl');

  React.useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  const onSubmit = useCallback(async (data: LinkedInFormData) => {
    if (!user) {
      setError('You must be logged in to analyze profiles');
      return;
    }
    
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting LinkedIn profile analysis...');
      
      const result = await analyzeLinkedInProfile(
        data.profileUrl,
        abortController.current.signal
      );
      
      console.log('Analysis completed, saving to database...');
      
      const { data: savedAnalysis, error: dbError } = await supabase
        .from('linkedin_analyses')
        .insert({
          user_id: user.id,
          profile_url: data.profileUrl,
          profile_score: result.score,
          suggestions: result.suggestions
        })
        .select('*')
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save analysis results');
      }

      console.log('Analysis saved successfully:', savedAnalysis);
      
      setAnalysis({
        id: savedAnalysis.id,
        userId: savedAnalysis.user_id,
        profileUrl: savedAnalysis.profile_url,
        profileScore: savedAnalysis.profile_score,
        suggestions: savedAnalysis.suggestions,
        createdAt: savedAnalysis.created_at
      });
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleRefreshAnalysis = useCallback(() => {
    if (currentProfileUrl) {
      clearProfileCache(currentProfileUrl);
      onSubmit({ profileUrl: currentProfileUrl });
    }
  }, [currentProfileUrl, onSubmit]);

  const debouncedSubmit = debounce(onSubmit, 300);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="sticky top-0 z-10 -mt-4 pt-4 pb-4 bg-dark-950">
        <h1 className="text-xl sm:text-2xl font-bold text-white">LinkedIn Profile Analyzer</h1>
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
                {...register('profileUrl')}
                className="input"
                placeholder="https://www.linkedin.com/in/your-profile"
              />
              {errors.profileUrl && (
                <p className="mt-1 text-sm text-red-400">{errors.profileUrl.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Analyze Profile
                </>
              )}
            </button>
          </div>
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

      {analysis && (
        <div className="mt-8 space-y-6">
          <div className="bg-dark-800 p-4 sm:p-6 rounded-lg shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Analysis Results</h2>
              <button
                onClick={handleRefreshAnalysis}
                disabled={isLoading}
                className="flex items-center text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">Profile Score</span>
                <span className={`text-lg font-semibold ${
                  analysis.profileScore >= 70 ? 'text-green-400' :
                  analysis.profileScore >= 50 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {Math.round(analysis.profileScore)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    analysis.profileScore >= 70 ? 'bg-green-500' :
                    analysis.profileScore >= 50 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${analysis.profileScore}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {analysis.suggestions.map((suggestion: ProfileSuggestion, index: number) => {
                const Icon = sectionIcons[suggestion.section];
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                      suggestion.priority === 'high' ? 'bg-red-500/10 border-red-500/20' :
                      suggestion.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/20' :
                      'bg-green-500/10 border-green-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${
                        suggestion.priority === 'high' ? 'text-red-400' :
                        suggestion.priority === 'medium' ? 'text-amber-400' :
                        'text-green-400'
                      }`} />
                      <div>
                        <p className="text-dark-100">{suggestion.suggestion}</p>
                        <p className="text-sm text-dark-400 mt-1 capitalize">
                          {suggestion.section}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}