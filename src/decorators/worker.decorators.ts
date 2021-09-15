import { SetMetadata } from '@nestjs/common';
import { WorkerEventName } from '../interfaces/worker.interfaces';

export const WORKER_LISTENER_METADATA = Symbol.for('WORKER_LISTENER_METADATA');
export const WORKER_ON_EVENT_METADATA = Symbol.for('WORKER_ON_EVENT_METADATA');

export function GraphileWorkerListener(): ClassDecorator {
  return SetMetadata(WORKER_LISTENER_METADATA, true);
}

export function OnWorkerEvent(event: WorkerEventName): MethodDecorator {
  return SetMetadata(WORKER_ON_EVENT_METADATA, event);
}
