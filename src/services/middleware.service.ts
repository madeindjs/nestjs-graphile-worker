import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { JobMiddleware } from '../interfaces/module-config.interfaces';

/**
 * Service responsible for managing and executing job middlewares.
 */
@Injectable()
export class MiddlewareService {
  private readonly logger = new Logger(MiddlewareService.name);

  /**
   * Wraps a task handler with the provided middlewares.
   * Middlewares are executed in the order they are provided.
   */
  wrapTaskHandler(
    originalHandler: (
      payload: any,
      helpers: JobHelpers,
    ) => Promise<void> | void,
    middlewares: JobMiddleware[] = [],
  ): (payload: any, helpers: JobHelpers) => Promise<void> {
    if (middlewares.length === 0) {
      return async (payload: any, helpers: JobHelpers) => {
        await originalHandler(payload, helpers);
      };
    }

    return async (payload: any, helpers: JobHelpers) => {
      let currentIndex = 0;

      const next = async (modifiedPayload?: any): Promise<void> => {
        const actualPayload = modifiedPayload ?? payload;

        if (currentIndex >= middlewares.length) {
          // All middlewares have been executed, call the original handler
          await originalHandler(actualPayload, helpers);
          return;
        }

        const middleware = middlewares[currentIndex++];

        try {
          await middleware(actualPayload, helpers, next);
        } catch (error) {
          this.logger.error(
            `Middleware execution failed at index ${currentIndex - 1}:`,
            error,
          );
          throw error;
        }
      };

      await next();
    };
  }
}
