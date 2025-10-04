import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { TaskList } from 'graphile-worker';

import { MetadataAccessorService } from './metadata-accessor.service';
import { MiddlewareExplorerService } from './middleware-explorer.service';
import { MiddlewareService } from './middleware.service';

/**
 * This service is responsible to scan all [Task decorators](../decorators/task.decorators.ts) and register them.
 *
 * Heavily inspired from [`BullExplorer`](https://github.com/nestjs/bull/blob/c230eab1dc26fb743a3428e61043167866b1e377/lib/bull.explorer.ts)
 */
@Injectable()
export class TaskExplorerService implements OnModuleInit {
  private readonly logger = new Logger(TaskExplorerService.name);

  public readonly taskList: TaskList = {};

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: MetadataAccessorService,
    private readonly metadataScanner: MetadataScanner,
    private readonly middlewareExplorerService: MiddlewareExplorerService,
    private readonly middlewareService: MiddlewareService,
  ) {}

  onModuleInit() {
    this.explore();
  }

  explore() {
    const providers: InstanceWrapper[] = this.discoveryService
      .getProviders()
      .filter((wrapper: InstanceWrapper) =>
        this.metadataAccessor.isTask(wrapper.metatype),
      );

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (key: string) => {
          if (this.metadataAccessor.isTaskHandler(instance[key])) {
            const name = this.metadataAccessor.getTaskMetadata(
              wrapper.metatype,
            );

            if (name === undefined) return;

            // Get the original handler
            const originalHandler = (...args: any[]) => instance[key](...args);

            // Get decorator-based global middlewares
            const globalMiddlewares =
              this.middlewareExplorerService.globalMiddlewares;

            // Wrap the handler with middlewares
            const wrappedHandler = this.middlewareService.wrapTaskHandler(
              originalHandler,
              globalMiddlewares,
            );

            this.taskList[name] = wrappedHandler;

            const middlewareNames = globalMiddlewares
              .map((mw) => mw.name || 'anonymous')
              .join(', ');
            const middlewareInfo =
              globalMiddlewares.length > 0
                ? `${globalMiddlewares.length} middleware(s): [${middlewareNames}]`
                : 'no middlewares';

            this.logger.debug(
              `Register ${name} from ${
                (instance as Object).constructor.name
              }.${key} with ${middlewareInfo}`,
            );
          }
        },
      );
    });
  }
}
