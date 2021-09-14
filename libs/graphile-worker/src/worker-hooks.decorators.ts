import { SetMetadata } from '@nestjs/common';
import { WorkerEventMap } from 'graphile-worker';

export const GRAPHILE_WORKER_LISTENER = Symbol.for('GraphileWorkerListener');

export const GRAPHILE_WORKER_ON_WORKER_EVENT = Symbol.for(
  'GraphileWorkerJobEvent',
);

export type WorkerEventName = keyof WorkerEventMap;

export function GraphileWorkerListener(): ClassDecorator {
  return SetMetadata(GRAPHILE_WORKER_LISTENER, true);
}

export function OnWorkerEvent(event: WorkerEventName): MethodDecorator {
  return SetMetadata(GRAPHILE_WORKER_ON_WORKER_EVENT, event);
}
