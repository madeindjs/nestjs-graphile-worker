import { SetMetadata } from '@nestjs/common';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';

export const MIDDLEWARE_METADATA = Symbol.for('MIDDLEWARE_METADATA');

export interface MiddlewareOptions {
  /**
   * Whether this middleware should be applied globally to all tasks.
   * @default false
   */
  global?: boolean;
}

/**
 * Marks a class as a job middleware.
 *
 * @param options Configuration options for the middleware
 *
 * @example
 * ```ts
 * @Middleware({ global: true })
 * class GlobalLoggingMiddleware implements MiddlewareProvider {
 *   use(payload: any, helpers: JobHelpers, next: Function) {
 *     console.log('Processing job:', payload);
 *     return next();
 *   }
 * }
 * ```
 */
export function Middleware(
  options: MiddlewareOptions = {},
): <T extends new (...args: any[]) => MiddlewareProvider>(target: T) => T {
  return <T extends new (...args: any[]) => MiddlewareProvider>(
    target: T,
  ): T => {
    SetMetadata(MIDDLEWARE_METADATA, options)(target);
    return target;
  };
}
