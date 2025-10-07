import { JobHelpers } from 'graphile-worker';

/**
 * Interface that middleware classes must implement
 */
export interface MiddlewareProvider {
  /**
   * The method that implements the middleware logic.
   *
   * @param payload - The job payload
   * @param helpers - Graphile Worker job helpers
   * @param next - Function to call the next middleware or handler with the (potentially modified) payload
   * @returns Promise that resolves when middleware processing is complete
   */
  use(
    payload: any,
    helpers: JobHelpers,
    next: (payload: any) => Promise<void>,
  ): Promise<void>;
}
