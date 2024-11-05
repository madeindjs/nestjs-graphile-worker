import type { LogFunction, LogLevel, LogMeta } from "@graphile/logger";
import { Logger as GraphileLogger } from "@graphile/logger";
import { Logger } from "@nestjs/common";

function graphileWorkerLogFactory(): LogFunction {
  const logger = new Logger("GraphileWorker");

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
        logger.debug(message, meta);
        break;
    }
  };
}

export const RunnerLogger = new GraphileLogger(graphileWorkerLogFactory);
