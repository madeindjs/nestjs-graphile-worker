import { Injectable, Type } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TASK_HANDLER_METADATA, TASK_METADATA } from "../decorators/task.decorators";
import { WORKER_LISTENER_METADATA, WORKER_ON_EVENT_METADATA } from "../decorators/worker.decorators";
import { WorkerEventName } from "../interfaces/worker.interfaces";

/**
 * Heavily inspired from [`BullMetadataAccessor`](https://github.com/nestjs/bull/blob/c230eab1dc26fb743a3428e61043167866b1e377/lib/bull-metadata.accessor.ts)
 */
@Injectable()
export class MetadataAccessorService {
  constructor(private readonly reflector: Reflector) {}

  // WORKER DECORATOR

  isListener(target: Type | Function): boolean {
    return this.hasMetadata(WORKER_LISTENER_METADATA, target);
  }

  isWorkerEvent(target: Type | Function): boolean {
    return this.hasMetadata(WORKER_ON_EVENT_METADATA, target);
  }

  getListenerMetadata(target: Type | Function): WorkerEventName | undefined {
    return this.reflector.get(WORKER_ON_EVENT_METADATA, target);
  }

  // TASK DECORATOR

  isTask(target: Type | Function): boolean {
    return this.hasMetadata(TASK_METADATA, target);
  }

  isTaskHandler(target: Type | Function): boolean {
    return this.hasMetadata(TASK_HANDLER_METADATA, target);
  }

  getTaskMetadata(target: Type | Function): string | undefined {
    return this.reflector.get(TASK_METADATA, target);
  }

  private hasMetadata(key: Symbol, target: Type | Function): boolean {
    if (!target) {
      return false;
    }

    return !!this.reflector.get(key, target);
  }
}
