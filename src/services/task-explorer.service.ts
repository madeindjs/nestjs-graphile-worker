import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { TaskList } from 'graphile-worker';

import { MiddlewareClass } from '../decorators/middleware.decorators';
import { JobMiddleware } from '../interfaces/module-config.interfaces';
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
    const taskProviders: InstanceWrapper[] = this.discoveryService
      .getProviders()
      .filter((wrapper: InstanceWrapper) =>
        this.metadataAccessor.isTask(wrapper.metatype),
      );

    for (const taskProvider of taskProviders) {
      const { instance } = taskProvider;

      const methodNames = this.metadataScanner.getAllMethodNames(
        Object.getPrototypeOf(instance),
      );

      for (const methodName of methodNames) {
        if (!this.metadataAccessor.isTaskHandler(instance[methodName])) {
          continue;
        }

        const taskName = this.metadataAccessor.getTaskMetadata(
          taskProvider.metatype,
        );

        if (taskName === undefined) continue;

        // Handle middlewares

        const originalHandler = (...args: any[]) =>
          instance[methodName](...args);
        const { globalMiddlewares, handlerMiddlewares } = this.getMiddlewares(
          instance[methodName],
        );
        const wrappedHandler = this.middlewareService.wrapTaskHandler(
          originalHandler,
          [...globalMiddlewares, ...handlerMiddlewares], // global first, then handler-specific
        );
        this.taskList[taskName] = wrappedHandler;

        this.logTaskRegistration(
          taskName,
          globalMiddlewares,
          handlerMiddlewares,
        );
      }
    }
  }

  /**
   * Returns the global and handler-specific middlewares applicable to a handler method
   */
  private getMiddlewares(handlerMethod: Function): {
    globalMiddlewares: JobMiddleware[];
    handlerMiddlewares: JobMiddleware[];
  } {
    const handlerMetadata =
      this.metadataAccessor.getHandlerMiddlewareMetadata(handlerMethod);
    const handlerMiddlewareClasses = handlerMetadata?.middlewareClasses || [];
    const handlerMiddlewares =
      this.middlewareExplorerService.getMiddlewaresByClasses(
        handlerMiddlewareClasses,
      );

    const allGlobalMiddlewareClasses =
      this.middlewareExplorerService.globalMiddlewareClasses;
    const bypassGlobalMiddlewareClasses =
      handlerMetadata?.options?.bypassGlobalMiddlewares || [];
    const filteredGlobalMiddlewareClasses = allGlobalMiddlewareClasses.filter(
      (middlewareClass: MiddlewareClass) =>
        !bypassGlobalMiddlewareClasses.includes(middlewareClass),
    );
    const globalMiddlewares =
      this.middlewareExplorerService.getMiddlewaresByClasses(
        filteredGlobalMiddlewareClasses,
      );

    return { globalMiddlewares, handlerMiddlewares };
  }

  /**
   * Logs task registration information with middleware details
   */
  private logTaskRegistration(
    taskName: string,
    globalMiddlewares: JobMiddleware[],
    handlerMiddlewares: JobMiddleware[],
  ) {
    const logGlobalMiddlewareIds = globalMiddlewares
      .map((middleware) => middleware.name)
      .join(', ');
    const logHandlerMiddlewareIds = handlerMiddlewares
      .map((middleware) => middleware.name)
      .join(', ');

    const globalMiddlewareInfo =
      globalMiddlewares.length > 0
        ? `${globalMiddlewares.length} global middleware(s): [${logGlobalMiddlewareIds}]`
        : 'no global middlewares';

    const handlerMiddlewareInfo =
      handlerMiddlewares.length > 0
        ? `${handlerMiddlewares.length} handler middleware(s): [${logHandlerMiddlewareIds}]`
        : 'no handler middlewares';

    this.logger.debug(
      `Registered task ${taskName} with ${globalMiddlewareInfo} and ${handlerMiddlewareInfo}`,
    );
  }
}
