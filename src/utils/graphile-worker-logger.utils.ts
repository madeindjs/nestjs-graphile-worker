import type { LogFunction, LogLevel, LogMeta } from "@graphile/logger";
import { Logger as GraphileLogger } from "@graphile/logger";
import { Logger } from "@nestjs/common";

export interface NestLikeLogger {
  debug: (message: string) => void;
  error: (message: string) => void;
  log: (message: string) => void;
  warn: (message: string) => void;
}

export function createGraphileWorkerLogFunction(
  logger: NestLikeLogger,
): LogFunction {
  return (level: LogLevel, message: string, meta?: LogMeta) => {
    if (meta !== undefined) {
      message += ` - ${JSON.stringify(meta)}`;
    }

    switch (level) {
      case "error":
        logger.error(message);
        break;
      case "warning":
        logger.warn(message);
        break;
      case "info":
        logger.log(message);
        break;
      case "debug":
        logger.debug(message);
        break;
    }
  };
}

function graphileWorkerLogFactory(_scope?: object): LogFunction {
  const logger = new Logger("GraphileWorker");
  return createGraphileWorkerLogFunction(logger);
}

export const RunnerLogger = new GraphileLogger(graphileWorkerLogFactory);
