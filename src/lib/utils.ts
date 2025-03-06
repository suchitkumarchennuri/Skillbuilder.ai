import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// LRU Cache implementation with serializable data
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number, ttl: number = 1000 * 60 * 30) { // 30 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh the entry
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove the least recently used item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  // Get serializable cache data
  toJSON(): { [key: string]: { value: V; timestamp: number } } {
    return Object.fromEntries(this.cache.entries());
  }
}

// Debounce with cleanup and serializable state
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  const debouncedFn = (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = undefined;
      func(...args);
    }, wait);
  };

  // Add cleanup method
  (debouncedFn as any).cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debouncedFn;
}

// Global cache instance
const globalCache = new LRUCache<string, any>(100);

// Memoize with proper cleanup and serializable caching
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  maxSize: number = 100,
  ttl: number = 1000 * 60 * 5 // 5 minutes default TTL
): T {
  const cache = new LRUCache<string, any>(maxSize, ttl);

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = func(...args);
    
    if (result instanceof Promise) {
      return result.then(value => {
        // Ensure value is cloneable before caching
        try {
          const clone = structuredClone(value);
          cache.set(key, clone);
          return value;
        } catch (error) {
          console.warn('Unable to cache non-cloneable value:', error);
          return value;
        }
      });
    }

    // Ensure value is cloneable before caching
    try {
      const clone = structuredClone(result);
      cache.set(key, clone);
    } catch (error) {
      console.warn('Unable to cache non-cloneable value:', error);
    }

    return result;
  }) as T;
}

// Performance monitoring with serializable data
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private measurements: Map<string, { times: number[]; lastUpdate: number }>;
  private readonly maxSamples: number;
  private readonly cleanupInterval: number;

  private constructor() {
    this.measurements = new Map();
    this.maxSamples = 100;
    this.cleanupInterval = 1000 * 60 * 5; // 5 minutes

    // Periodically clean up old measurements
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupOldMeasurements(), this.cleanupInterval);
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasurement(key: string): () => number {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMeasurement(key, duration);
      return duration;
    };
  }

  private recordMeasurement(key: string, duration: number): void {
    const now = Date.now();
    const measurement = this.measurements.get(key) || { times: [], lastUpdate: now };
    
    measurement.times.push(duration);
    measurement.lastUpdate = now;

    if (measurement.times.length > this.maxSamples) {
      measurement.times.shift();
    }

    this.measurements.set(key, measurement);
  }

  getAverageTime(key: string): number {
    const measurement = this.measurements.get(key);
    if (!measurement || measurement.times.length === 0) return 0;
    
    const sum = measurement.times.reduce((acc, val) => acc + val, 0);
    return sum / measurement.times.length;
  }

  private cleanupOldMeasurements(): void {
    const now = Date.now();
    for (const [key, measurement] of this.measurements.entries()) {
      if (now - measurement.lastUpdate > this.cleanupInterval) {
        this.measurements.delete(key);
      }
    }
  }

  // Get serializable measurement data
  toJSON(): { [key: string]: { times: number[]; lastUpdate: number } } {
    return Object.fromEntries(this.measurements.entries());
  }

  clearMeasurements(): void {
    this.measurements.clear();
  }
}

// Resource cleanup helper with serializable state
export class ResourceManager {
  private static cleanupTasks: Array<() => void> = [];

  static register(cleanup: () => void): void {
    this.cleanupTasks.push(cleanup);
  }

  static unregister(cleanup: () => void): void {
    this.cleanupTasks = this.cleanupTasks.filter(task => task !== cleanup);
  }

  static cleanup(): void {
    while (this.cleanupTasks.length > 0) {
      const task = this.cleanupTasks.pop();
      if (task) task();
    }
  }

  // Get serializable state
  static toJSON(): { taskCount: number } {
    return {
      taskCount: this.cleanupTasks.length
    };
  }
}

// Automatic cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    ResourceManager.cleanup();
    globalCache.clear();
    PerformanceMonitor.getInstance().clearMeasurements();
  });
}