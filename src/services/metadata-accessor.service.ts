import { Injectable, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  GRAPHILE_WORKER_LISTENER,
  GRAPHILE_WORKER_ON_WORKER_EVENT,
} from '../decorators/worker-hooks.decorators';

/**
 * Heavily inspired from [`BullMetadataAccessor`](https://github.com/nestjs/bull/blob/c230eab1dc26fb743a3428e61043167866b1e377/lib/bull-metadata.accessor.ts)
 */
@Injectable()
export class MetadataAccessorService {
  constructor(private readonly reflector: Reflector) {}

  isListener(target: Type<any> | Function): boolean {
    if (!target) {
      return false;
    }

    return !!this.reflector.get(GRAPHILE_WORKER_LISTENER, target);
  }

  isWorkerEvent(target: Type<any> | Function): boolean {
    if (!target) {
      return false;
    }

    return !!this.reflector.get(GRAPHILE_WORKER_ON_WORKER_EVENT, target);
  }

  getListenerMetadata(target: Type<any> | Function): any | undefined {
    return this.reflector.get(GRAPHILE_WORKER_ON_WORKER_EVENT, target);
  }
}
