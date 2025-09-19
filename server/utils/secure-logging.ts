import { Request, Response, NextFunction } from "express";

// Sensitive fields that should be redacted from logs
const SENSITIVE_FIELDS = [
  'password', 'token', 'auth', 'authorization', 'secret', 'key', 'apiKey',
  'accessToken', 'refreshToken', 'sessionToken', 'authToken', 'bearer',
  'credential', 'credentials', 'pin', 'ssn', 'email', 'phone', 'phoneNumber',
  'personalData', 'pii', 'personalInfo', 'privateKey', 'hash', 'salt'
];

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LoggerConfig {
  level: LogLevel;
  enableApiResponseLogging: boolean;
  enablePiiRedaction: boolean;
  maxLogLength: number;
}

// Get logger configuration based on environment
function getLoggerConfig(): LoggerConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    level: isProduction ? LogLevel.WARN : LogLevel.DEBUG,
    enableApiResponseLogging: !isProduction, // Disable full API response logging in production
    enablePiiRedaction: true, // Always enable PII redaction
    maxLogLength: isProduction ? 200 : 500 // Shorter logs in production
  };
}

// Recursively redact sensitive data from objects
function redactSensitiveData(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH_REACHED]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Check if the string looks like a token or sensitive data
    if (obj.length > 20 && (obj.includes('Bearer') || obj.includes('token') || obj.match(/^[A-Za-z0-9+/=]{20,}$/))) {
      return '[REDACTED]';
    }
    return obj;
  }
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }
  
  const redactedObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key matches sensitive field patterns
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase()) || 
      lowerKey.endsWith('password') ||
      lowerKey.endsWith('token') ||
      lowerKey.endsWith('secret')
    );
    
    if (isSensitive) {
      redactedObj[key] = '[REDACTED]';
    } else {
      redactedObj[key] = redactSensitiveData(value, depth + 1);
    }
  }
  
  return redactedObj;
}

// Create structured log entry
function createLogEntry(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  
  let logEntry = `[${timestamp}] ${levelName}: ${message}`;
  
  if (data) {
    const config = getLoggerConfig();
    const processedData = config.enablePiiRedaction ? redactSensitiveData(data) : data;
    
    try {
      const dataStr = JSON.stringify(processedData);
      if (dataStr.length <= config.maxLogLength) {
        logEntry += ` | ${dataStr}`;
      } else {
        logEntry += ` | ${dataStr.substring(0, config.maxLogLength)}...`;
      }
    } catch (err) {
      logEntry += ' | [LOG_SERIALIZATION_ERROR]';
    }
  }
  
  return logEntry;
}

// Structured logger
export class SecureLogger {
  private config: LoggerConfig;
  
  constructor() {
    this.config = getLoggerConfig();
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }
  
  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(createLogEntry(LogLevel.ERROR, message, data));
    }
  }
  
  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(createLogEntry(LogLevel.WARN, message, data));
    }
  }
  
  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(createLogEntry(LogLevel.INFO, message, data));
    }
  }
  
  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(createLogEntry(LogLevel.DEBUG, message, data));
    }
  }
}

// Express middleware for secure API logging
export function createSecureApiLogger() {
  const logger = new SecureLogger();
  const config = getLoggerConfig();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    // Only capture response in development for API endpoints
    if (config.enableApiResponseLogging && path.startsWith("/api")) {
      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };
    }

    res.on("finish", () => {
      const duration = Date.now() - start;
      
      if (path.startsWith("/api")) {
        const logMessage = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        
        // In production, only log basic info without response data
        if (config.enableApiResponseLogging && capturedJsonResponse) {
          logger.info(logMessage, { response: capturedJsonResponse });
        } else {
          // Production logging: only basic metrics
          if (res.statusCode >= 400) {
            logger.error(logMessage);
          } else if (duration > 1000) {
            logger.warn(`${logMessage} [SLOW_API]`);
          } else {
            logger.debug(logMessage);
          }
        }
      }
    });

    next();
  };
}

// Export singleton logger instance
export const secureLogger = new SecureLogger();