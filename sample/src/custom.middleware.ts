import { Injectable } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Middleware } from '../../src/decorators/middleware.decorators';
import { MiddlewareProvider } from '../../src/interfaces/middleware.interfaces';

@Injectable()
@Middleware({ global: true })
export class CustomMiddleware implements MiddlewareProvider {
  async use(
    payload: any,
    _helpers: JobHelpers,
    next: (payload?: any) => Promise<void>,
  ): Promise<void> {
    console.log('Custom middleware invoked');
    try {
      await next({ payload, enriched: true });
      console.log('Job completed successfully');
    } catch (error) {
      console.error('Job failed:', error);
      throw error;
    }
  }
}
