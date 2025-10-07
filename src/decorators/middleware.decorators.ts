import { SetMetadata } from '@nestjs/common';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';

export const MIDDLEWARE_METADATA = Symbol.for('MIDDLEWARE_METADATA');
export const USE_MIDDLEWARE_METADATA = Symbol.for('USE_MIDDLEWARE_METADATA');

export interface MiddlewareOptions {
  /**
   * Whether this middleware should be applied globally to all task handlers.
   * @default false
   */
  global?: boolean;
}

/**
 * Internal interface for middleware metadata stored by the decorator
 * @internal
 */
export interface MiddlewareMetadata extends MiddlewareOptions {
  /**
   * Unique identifier for the middleware
   */
  id: string;
}

/**
 * Marks a class as a job middleware.
 *
 * @param id Unique identifier for the middleware (required)
 * @param options Optional configuration for the middleware
 *
 * @example
 * ```ts
 * @Middleware('myGlobalMiddleware', { global: true })
 * class MyGlobalMiddleware implements MiddlewareProvider {
 *   use(payload: any, helpers: JobHelpers, next: Function) {
 *     // middleware logic
 *     return next();
 *   }
 * }
 *
 * @Middleware('myHandlerMiddleware')
 * class MyHandlerMiddleware implements MiddlewareProvider {
 *   use(payload: any, helpers: JobHelpers, next: Function) {
 *     // middleware logic
 *     return next();
 *   }
 * }
 * ```
 */
export function Middleware(
  id: string,
  options: MiddlewareOptions = {},
): <T extends new (...args: any[]) => MiddlewareProvider>(target: T) => T {
  return <T extends new (...args: any[]) => MiddlewareProvider>(
    target: T,
  ): T => {
    const metadata: MiddlewareMetadata = { id, ...options };
    SetMetadata(MIDDLEWARE_METADATA, metadata)(target);
    return target;
  };
}

/**
 * Options for the @UseMiddlewares decorator
 */
export interface UseMiddlewaresOptions {
  /**
   * Array of global middleware IDs to bypass for this specific handler.
   * These middlewares will not be executed for this handler, even if they are global.
   * If a bypassed middleware is also specified in the middlewareIds array, it will be executed from the latter array.
   */
  bypassGlobalMiddlewares?: string[];
}

/**
 * Internal metadata interface for UseMiddlewares decorator
 * @internal
 */
export interface UseMiddlewaresMetadata {
  middlewareIds: string[];
  options?: UseMiddlewaresOptions;
}

/**
 * Decorator to specify which handler-specific middlewares should be applied to a task handler.
 * Global middlewares are always applied first, followed by the specified handler middlewares.
 * Duplicate middlewares (if a global middleware is specified here) will be skipped.
 *
 * @param middlewareIds Array of middleware IDs to apply to this handler
 * @param options Optional configuration for middleware handling
 *
 * @example
 * ```ts
 * @Injectable()
 * @Task('myTask')
 * export class MyTask {
 *   @UseMiddlewares(['myMiddleware1', 'myMiddleware2'])
 *   @TaskHandler()
 *   handler(payload: any, helpers: JobHelpers) {
 *     // handler logic
 *   }
 *
 *   @UseMiddlewares(
 *     ['localMiddleware'],
 *     { bypassGlobalMiddlewares: ['globalMiddleware'] }
 *   )
 *   @TaskHandler()
 *   handlerWithBypass(payload: any, helpers: JobHelpers) {
 *     // handler logic with bypassed global middleware
 *   }
 * }
 * ```
 */
export function UseMiddlewares(
  middlewareIds: string[],
  options?: UseMiddlewaresOptions,
): MethodDecorator {
  const metadata: UseMiddlewaresMetadata = {
    middlewareIds,
    options,
  };
  return SetMetadata(USE_MIDDLEWARE_METADATA, metadata);
}
