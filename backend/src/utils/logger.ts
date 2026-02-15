/**
 * Logger utility for structured error logging and monitoring
 * Follows the error-detective agent patterns for log analysis and pattern detection
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  action: string;
  message: string;
  userId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
  duration?: number; // milliseconds
}

class Logger {
  private service: string;
  private requestId?: string;

  constructor(service: string) {
    this.service = service;
  }

  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Parse and extract error patterns from logs
   * Used for monitoring and anomaly detection
   */
  private extractErrorPattern(error: Error | string): { name: string; message: string; stack?: string; code?: string } {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }
    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  debug(action: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      service: this.service,
      action,
      message,
      requestId: this.requestId,
      metadata,
    };
    console.debug(this.formatLog(entry));
  }

  info(action: string, message: string, duration?: number, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      service: this.service,
      action,
      message,
      requestId: this.requestId,
      duration,
      metadata,
    };
    console.log(this.formatLog(entry));
  }

  warn(action: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      service: this.service,
      action,
      message,
      requestId: this.requestId,
      metadata,
    };
    console.warn(this.formatLog(entry));
  }

  error(action: string, message: string, error?: Error | string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      service: this.service,
      action,
      message,
      requestId: this.requestId,
      error: error ? this.extractErrorPattern(error) : undefined,
      metadata,
    };
    console.error(this.formatLog(entry));
  }

  critical(action: string, message: string, error?: Error | string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.CRITICAL,
      service: this.service,
      action,
      message,
      requestId: this.requestId,
      error: error ? this.extractErrorPattern(error) : undefined,
      metadata,
    };
    console.error(this.formatLog(entry));
    // In production, this should also trigger alerts/notifications
  }

  /**
   * Log API request with timing information
   * Useful for monitoring performance and identifying bottlenecks
   */
  logRequest(action: string, method: string, path: string, statusCode: number, duration: number, userId?: string): void {
    this.info(action, `${method} ${path}`, duration, {
      statusCode,
      userId,
    });
  }

  /**
   * Log scraper operation with retry information
   * Used to track scraper performance and identify failure patterns
   */
  logScraperOperation(
    source: 'alibaba' | 'made-in-china',
    query: string,
    success: boolean,
    duration: number,
    error?: Error,
    retries?: number,
  ): void {
    if (success) {
      this.info('SCRAPER_SUCCESS', `Successfully scraped ${source} for query: "${query}"`, duration, {
        source,
        query,
        retries: retries || 0,
      });
    } else {
      this.error('SCRAPER_FAILURE', `Failed to scrape ${source} for query: "${query}"`, error, {
        source,
        query,
        retries: retries || 0,
      });
    }
  }

  /**
   * Log rate limit hit
   * Useful for monitoring API usage patterns
   */
  logRateLimitHit(userId: string, limit: number, window: string): void {
    this.warn('RATE_LIMIT_HIT', `Rate limit exceeded for user`, {
      userId,
      limit,
      window,
    });
  }

  /**
   * Create a child logger with additional context
   * Useful for tracing requests through the system
   */
  createChild(childService: string, requestId?: string): Logger {
    const child = new Logger(`${this.service}:${childService}`);
    if (requestId) {
      child.setRequestId(requestId);
    }
    return child;
  }
}

// Export logger factory function
export function createLogger(service: string): Logger {
  return new Logger(service);
}

// Default logger instance for quick use
export const logger = new Logger('SourceScout');

export default Logger;
