/**
 * DualMind Arena - Performance Monitor
 * Real-time performance tracking and optimization
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: null,
      apiCalls: [],
      renders: [],
      errors: []
    };
    this.init();
  }

  init() {
    this.trackPageLoad();
    this.trackAPIPerformance();
    this.trackRenderPerformance();
    this.trackErrors();
  }

  trackPageLoad() {
    if (performance && performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = performance.timing;
          this.metrics.pageLoad = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            dom: timing.domContentLoadedEventEnd - timing.domLoading,
            load: timing.loadEventEnd - timing.loadEventStart,
            total: timing.loadEventEnd - timing.navigationStart
          };
          
          if (window.DUALMIND_CONFIG?.debug?.showPerformanceMetrics) {
            console.log('Page Load Metrics:', this.metrics.pageLoad);
          }
        }, 0);
      });
    }
  }

  trackAPIPerformance() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.apiCalls.push({
          url,
          duration,
          status: response.status,
          timestamp: Date.now()
        });
        
        // Keep only last 50 calls
        if (this.metrics.apiCalls.length > 50) {
          this.metrics.apiCalls.shift();
        }
        
        // Log slow API calls
        if (duration > 2000 && window.DUALMIND_CONFIG?.debug?.logApiCalls) {
          console.warn(`Slow API call: ${url} took ${duration.toFixed(0)}ms`);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.metrics.apiCalls.push({
          url,
          duration: endTime - startTime,
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    };
  }

  trackRenderPerformance() {
    if (PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.renders.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
          
          // Keep only last 20 renders
          if (this.metrics.renders.length > 20) {
            this.metrics.renders = this.metrics.renders.slice(-20);
          }
        });
        
        observer.observe({ entryTypes: ['measure'] });
      } catch (e) {
        console.warn('Performance Observer not supported:', e);
      }
    }
  }

  trackErrors() {
    window.addEventListener('error', (event) => {
      this.metrics.errors.push({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now()
      });
      
      // Keep only last 10 errors
      if (this.metrics.errors.length > 10) {
        this.metrics.errors.shift();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errors.push({
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        timestamp: Date.now()
      });
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageApiTime: this.getAverageApiTime(),
      slowApiCalls: this.getSlowApiCalls(),
      errorCount: this.metrics.errors.length
    };
  }

  getAverageApiTime() {
    if (this.metrics.apiCalls.length === 0) return 0;
    const total = this.metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0);
    return (total / this.metrics.apiCalls.length).toFixed(2);
  }

  getSlowApiCalls() {
    return this.metrics.apiCalls
      .filter(call => call.duration > 1000)
      .sort((a, b) => b.duration - a.duration);
  }

  reportMetrics() {
    const metrics = this.getMetrics();
    console.group('Performance Metrics');
    console.table({
      'Page Load': `${metrics.pageLoad?.total || 'N/A'}ms`,
      'Avg API Time': `${metrics.averageApiTime}ms`,
      'Total API Calls': metrics.apiCalls.length,
      'Slow API Calls': metrics.slowApiCalls.length,
      'Errors': metrics.errorCount
    });
    console.groupEnd();
    return metrics;
  }

  // Performance optimization suggestions
  getOptimizationSuggestions() {
    const suggestions = [];
    const metrics = this.getMetrics();

    if (metrics.averageApiTime > 1000) {
      suggestions.push('API calls are slow. Consider caching or optimizing backend.');
    }

    if (metrics.slowApiCalls.length > 5) {
      suggestions.push(`${metrics.slowApiCalls.length} slow API calls detected.`);
    }

    if (metrics.pageLoad && metrics.pageLoad.total > 3000) {
      suggestions.push('Page load time > 3s. Consider code splitting or lazy loading.');
    }

    if (metrics.errorCount > 0) {
      suggestions.push(`${metrics.errorCount} errors detected. Check console for details.`);
    }

    return suggestions;
  }

  // Clear metrics
  clear() {
    this.metrics = {
      pageLoad: null,
      apiCalls: [],
      renders: [],
      errors: []
    };
  }
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Export to window
window.performanceMonitor = performanceMonitor;

// Add keyboard shortcut to view metrics (Ctrl+Shift+P)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    performanceMonitor.reportMetrics();
    const suggestions = performanceMonitor.getOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.group('Optimization Suggestions');
      suggestions.forEach(s => console.log('•', s));
      console.groupEnd();
    }
  }
});

// Auto-report on page unload if debug enabled
window.addEventListener('beforeunload', () => {
  if (window.DUALMIND_CONFIG?.debug?.showPerformanceMetrics) {
    performanceMonitor.reportMetrics();
  }
});
