import { expose } from 'comlink';
import { TECHNICAL_SKILLS, SOFT_SKILLS, EXCLUDED_WORDS } from './constants';

// Custom error class for worker errors
class WorkerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'WorkerError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code
    };
  }
}

// Optimized keyword extraction with Web Workers
function extractKeywords(text: string): string[] {
  try {
    if (!text || typeof text !== 'string') {
      throw new WorkerError('Invalid input text', 'INVALID_INPUT');
    }

    // Pre-process text in chunks for better performance
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      throw new WorkerError('Text is empty after cleaning', 'EMPTY_TEXT');
    }

    const wordCount = new Map<string, number>();
    const words = cleanText.split(' ');
    const batchSize = 500;

    // Process words in larger batches
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      for (const word of batch) {
        const normalizedWord = word.replace(/[^a-z0-9-]/g, '');
        
        if (normalizedWord.length <= 2 || EXCLUDED_WORDS.has(normalizedWord)) {
          continue;
        }

        if (TECHNICAL_SKILLS.has(normalizedWord) || SOFT_SKILLS.has(normalizedWord)) {
          wordCount.set(normalizedWord, (wordCount.get(normalizedWord) || 0) + 1);
          continue;
        }
        
        if (normalizedWord.includes('-')) {
          const compounds = normalizedWord.split('-');
          if (compounds.some(part => TECHNICAL_SKILLS.has(part))) {
            wordCount.set(normalizedWord, (wordCount.get(normalizedWord) || 0) + 1);
          }
        }
      }
    }

    if (wordCount.size === 0) {
      throw new WorkerError('No keywords found in text', 'NO_KEYWORDS');
    }

    return Array.from(wordCount.entries())
      .sort(([wordA, countA], [wordB, countB]) => {
        const techA = TECHNICAL_SKILLS.has(wordA);
        const techB = TECHNICAL_SKILLS.has(wordB);
        if (techA !== techB) return techB ? 1 : -1;
        return countB - countA;
      })
      .map(([word]) => word)
      .slice(0, 50);
  } catch (error) {
    if (error instanceof WorkerError) {
      throw error;
    }
    throw new WorkerError(
      error instanceof Error ? error.message : 'Unknown error during keyword extraction',
      'EXTRACTION_ERROR'
    );
  }
}

// Worker API
const workerApi = {
  analyzeText: async (text: string, isJobDescription: boolean) => {
    const startTime = performance.now();
    const keywords = extractKeywords(text);
    const duration = performance.now() - startTime;

    return {
      keywords,
      duration,
      isJobDescription
    };
  }
};

expose(workerApi);