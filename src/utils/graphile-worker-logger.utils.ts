import {
  LogFunction,
  Logger as GraphileLogger,
  LogLevel,
  LogMeta,
} from '@graphile/logger';
import { Logger } from '@nestjs/common';

function graphileWorkerLogFactory(_scope): LogFunction {
  const logger = new Logger('GraphileWorker');

  return (level: LogLevel, message: string, meta?: LogMeta) => {
    if (meta !== undefined) {
      message += ` - ${JSON.stringify(meta)}`;
    }

    switch (level) {
      case LogLevel.ERROR:
        logger.error(message);
        break;
      case LogLevel.WARNING:
        logger.warn(message);
        break;
      case LogLevel.INFO:
        logger.log(message);
        break;
      case LogLevel.DEBUG:
        logger.debug(message, meta);
        break;
    }
  };
}

export const RunnerLogger = new GraphileLogger(graphileWorkerLogFactory);
