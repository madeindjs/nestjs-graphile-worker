import { SetMetadata } from '@nestjs/common';
import { WorkerEventName } from '../interfaces/worker.interfaces';

export const GRAPHILE_WORKER_LISTENER = Symbol.for('GRAPHILE_WORKER_LISTENER');

export const GRAPHILE_WORKER_ON_WORKER_EVENT = Symbol.for(
  'GRAPHILE_WORKER_ON_WORKER_EVENT',
);

export function GraphileWorkerListener(): ClassDecorator {
  return SetMetadata(GRAPHILE_WORKER_LISTENER, true);
}

export function OnWorkerEvent(event: WorkerEventName): MethodDecorator {
  return SetMetadata(GRAPHILE_WORKER_ON_WORKER_EVENT, event);
}
