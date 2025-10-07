import { Injectable } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Middleware, MiddlewareProvider } from '../../../src/index';

@Injectable()
@Middleware('local2')
export class Local2Middleware implements MiddlewareProvider {
  async use(
    payload: any,
    _helpers: JobHelpers,
    next: (payload: any) => Promise<void>,
  ): Promise<void> {
    console.log('Local middleware 2 invoked');
    await next(payload);
  }
}
