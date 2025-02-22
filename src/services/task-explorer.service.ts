import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { MetadataScanner } from "@nestjs/core/metadata-scanner";
import { TaskList } from "graphile-worker";
import { MetadataAccessorService } from "./metadata-accessor.service";

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

            this.taskList[name] = (...args) => instance[key](...args);

            this.logger.debug(
              `Register ${name} from ${
                (instance as Object).constructor.name
              }.${key}`,
            );
          }
        },
      );
    });
  }
}
