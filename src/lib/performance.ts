// Performance monitoring utilities

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private observers: PerformanceObserver[] = [];

  // Start timing a performance metric
  start(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  // End timing and record the duration
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric = {
      ...metric,
      endTime,
      duration,
    };

    this.metrics.set(name, completedMetric);
    this.logMetric(completedMetric);

    return duration;
  }

  // Get a specific metric
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  // Get all metrics
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
  }

  // Log metric to console
  private logMetric(metric: PerformanceMetric): void {
    if (metric.duration) {
      console.log(`⏱️ ${metric.name}: ${metric.duration.toFixed(2)}ms`, metric.metadata || '');
    }
  }

  // Monitor async function performance
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  // Monitor sync function performance
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  // Get performance summary
  getSummary(): {
    totalMetrics: number;
    averageDuration: number;
    slowestMetric: PerformanceMetric | null;
    fastestMetric: PerformanceMetric | null;
    metricsByDuration: PerformanceMetric[];
  } {
    const completedMetrics = this.getAllMetrics().filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestMetric: null,
        fastestMetric: null,
        metricsByDuration: [],
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / durations.length;

    const sortedMetrics = completedMetrics.sort((a, b) => b.duration! - a.duration!);

    return {
      totalMetrics: completedMetrics.length,
      averageDuration,
      slowestMetric: sortedMetrics[0],
      fastestMetric: sortedMetrics[sortedMetrics.length - 1],
      metricsByDuration: sortedMetrics,
    };
  }

  // Initialize Web Vitals monitoring
  initWebVitals(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log(`🎯 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            console.log(`⚡ FID: ${entry.processingStart - entry.startTime.toFixed(2)}ms`);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID monitoring not supported');
      }

      // Monitor Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          console.log(`📐 CLS: ${clsValue.toFixed(4)}`);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }
    }
  }

  // Cleanup observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance monitoring hooks
export const usePerformance = () => {
  const measureAsync = async <T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return performanceMonitor.measureAsync(name, fn, metadata);
  };

  const measure = <T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T => {
    return performanceMonitor.measure(name, fn, metadata);
  };

  const start = (name: string, metadata?: Record<string, any>) => {
    performanceMonitor.start(name, metadata);
  };

  const end = (name: string): number | null => {
    return performanceMonitor.end(name);
  };

  const getSummary = () => {
    return performanceMonitor.getSummary();
  };

  return {
    measureAsync,
    measure,
    start,
    end,
    getSummary,
  };
};

// Initialize performance monitoring in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  performanceMonitor.initWebVitals();
  
  // Log performance summary every 30 seconds in development
  setInterval(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.totalMetrics > 0) {
      console.log('📊 Performance Summary:', {
        totalMetrics: summary.totalMetrics,
        averageDuration: summary.averageDuration.toFixed(2) + 'ms',
        slowest: summary.slowestMetric?.name + ' (' + summary.slowestMetric?.duration?.toFixed(2) + 'ms)',
        fastest: summary.fastestMetric?.name + ' (' + summary.fastestMetric?.duration?.toFixed(2) + 'ms)',
      });
    }
  }, 30000);
}

export default performanceMonitor;
