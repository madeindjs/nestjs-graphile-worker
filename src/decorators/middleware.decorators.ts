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
 * Represents a middleware class constructor
 */
export type MiddlewareClass = new (...args: any[]) => MiddlewareProvider;

/**
 * Marks a class as a job middleware.
 *
 * @param options Optional configuration for the middleware
 *
 * @example
 * ```ts
 * @Middleware({ global: true })
 * class MyGlobalMiddleware implements MiddlewareProvider {
 *   use(payload: any, helpers: JobHelpers, next: Function) {
 *     // middleware logic
 *     return next(payload);
 *   }
 * }
 *
 * @Middleware()
 * class MyHandlerMiddleware implements MiddlewareProvider {
 *   use(payload: any, helpers: JobHelpers, next: Function) {
 *     // middleware logic
 *     return next(payload);
 *   }
 * }
 * ```
 */
export function Middleware(
  options: MiddlewareOptions = {},
): <T extends MiddlewareClass>(target: T) => T {
  return <T extends MiddlewareClass>(target: T): T => {
    const metadata: MiddlewareOptions = { ...options };
    SetMetadata(MIDDLEWARE_METADATA, metadata)(target);
    return target;
  };
}

/**
 * Options for the @UseMiddlewares decorator
 */
export interface UseMiddlewaresOptions {
  /**
   * Array of global middleware classes to bypass for this specific handler.
   * These middlewares will not be executed for this handler, even if they are global.
   * If a bypassed middleware is also specified in the middlewares array, it will be executed from the latter array.
   */
  bypassGlobalMiddlewares?: MiddlewareClass[];
}

/**
 * Internal metadata interface for UseMiddlewares decorator
 * @internal
 */
export interface UseMiddlewaresMetadata {
  middlewareClasses: MiddlewareClass[];
  options?: UseMiddlewaresOptions;
}

/**
 * Decorator to specify which handler-specific middlewares should be applied to a task handler.
 * Global middlewares are always applied first, followed by the specified handler middlewares.
 * Duplicate middlewares (if a global middleware is specified here) will be skipped.
 *
 * @param middlewareClasses Array of middleware classes to apply to this handler
 * @param options Optional configuration for middleware handling
 *
 * @example
 * ```ts
 * @Injectable()
 * @Task('myTask')
 * export class MyTask {
 *   @UseMiddlewares([MyMiddleware1, MyMiddleware2])
 *   @TaskHandler()
 *   handler(payload: any, helpers: JobHelpers) {
 *     // handler logic
 *   }
 *
 *   @UseMiddlewares(
 *     [LocalMiddleware],
 *     { bypassGlobalMiddlewares: [GlobalMiddleware] }
 *   )
 *   @TaskHandler()
 *   handlerWithBypass(payload: any, helpers: JobHelpers) {
 *     // handler logic with bypassed global middleware
 *   }
 * }
 * ```
 */
export function UseMiddlewares(
  middlewareClasses: MiddlewareClass[],
  options?: UseMiddlewaresOptions,
): MethodDecorator {
  const metadata: UseMiddlewaresMetadata = {
    middlewareClasses,
    options,
  };
  return SetMetadata(USE_MIDDLEWARE_METADATA, metadata);
}
