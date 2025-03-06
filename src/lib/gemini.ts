import { z } from 'zod';
import { memoize, PerformanceMonitor } from './utils';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = 'google/gemini-flash-1.5-8b';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const API_TIMEOUT = 15000; // 15 seconds

const responseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string(),
    }),
  })),
});

// Enhanced prompt for more accurate analysis
const SYSTEM_PROMPT = `You are an expert resume analyst. Your task is to analyze the provided resume and job description to generate highly relevant, achievement-focused bullet points for the resume. Follow these strict guidelines:

1. Each bullet point must:
   - Begin with a strong action verb in the correct tense
   - Include specific, quantifiable achievements where possible
   - Demonstrate direct relevance to the job requirements
   - Be concise yet impactful (10-15 words maximum)
   - Focus on results and impact, not just responsibilities

2. Format:
   - Generate exactly 5 bullet points
   - Each bullet point starts with "•"
   - Ensure each point is unique and adds value
   - Order by relevance to the job requirements

3. Content Focus:
   - Match key skills and requirements from the job description
   - Emphasize achievements that align with the role
   - Include technical skills and tools when relevant
   - Highlight leadership and soft skills where appropriate

Example format:
• Increased team productivity by 40% through implementation of automated testing framework
• Led cross-functional team of 8 engineers to deliver critical project under budget`;

export const analyzeWithGemini = memoize(
  async (resumeText: string, jobDescription: string, signal?: AbortSignal): Promise<string> => {
    const performanceMonitor = PerformanceMonitor.getInstance();
    const endMeasurement = performanceMonitor.startMeasurement('gemini-analysis');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `Job Description:\n${jobDescription}\n\nResume:\n${resumeText}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.2,
          top_p: 0.9,
          presence_penalty: 0.3,
          frequency_penalty: 0.5,
        }),
        signal: signal ? signal : controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const validated = responseSchema.parse(data);
      const result = validated.choices[0].message.content;

      const duration = endMeasurement();
      console.debug(`Gemini analysis completed in ${duration.toFixed(2)}ms`);

      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  100,
  CACHE_TTL
);