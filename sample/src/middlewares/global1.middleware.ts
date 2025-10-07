import { Injectable } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Middleware, MiddlewareProvider } from '../../../src/index';

@Injectable()
@Middleware('global1', { global: true })
export class Global1Middleware implements MiddlewareProvider {
  async use(
    payload: any,
    _helpers: JobHelpers,
    next: (payload: any) => Promise<void>,
  ): Promise<void> {
    console.log('Global middleware 1 invoked');
    await next(payload);
  }
}
