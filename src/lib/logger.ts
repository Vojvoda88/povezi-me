type LogContext = Record<string, unknown>;

export const logger = {
  info: (msg: string, context: LogContext = {}) => {
    console.log(JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      level: 'INFO', 
      msg, 
      ...context 
    }));
  },
  error: (msg: string, error?: unknown, context: LogContext = {}) => {
    const isProd = process.env.NODE_ENV === 'production';
    const errorDetails = error instanceof Error 
      ? { 
          error_message: error.message, 
          stack: isProd ? undefined : error.stack 
        }
      : { error_raw: String(error) };

    console.error(JSON.stringify({ 
      timestamp: new Date().toISOString(), 
      level: 'ERROR', 
      msg, 
      ...errorDetails,
      ...context 
    }));
  }
};