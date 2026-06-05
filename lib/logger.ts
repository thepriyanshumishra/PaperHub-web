type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

function writeLog(level: LogLevel, message: string, userId?: string, context?: Record<string, any>, err?: any) {
  // Never log stack traces or raw errors in production console if configured,
  // but standard JSON formatting keeps it structured.
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    userId,
    context
  };

  if (err instanceof Error) {
    payload.error = {
      message: err.message,
      // Only include stack trace if not in production to prevent leaking internals
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    };
  } else if (err) {
    payload.error = {
      message: String(err)
    };
  }

  // Print structured JSON log to stdout/stderr
  if (level === 'ERROR') {
    console.error(JSON.stringify(payload));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info: (message: string, userId?: string, context?: Record<string, any>) => {
    writeLog('INFO', message, userId, context);
  },
  warn: (message: string, userId?: string, context?: Record<string, any>) => {
    writeLog('WARN', message, userId, context);
  },
  error: (message: string, err: any, userId?: string, context?: Record<string, any>) => {
    writeLog('ERROR', message, userId, context, err);
  }
};
