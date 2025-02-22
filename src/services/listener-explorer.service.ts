import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { MetadataScanner } from "@nestjs/core/metadata-scanner";
import { WorkerEventName } from "../interfaces/worker.interfaces";
import { MetadataAccessorService } from "./metadata-accessor.service";

/**
 * This service is responsible to scan all [Worker decorators](../decorators/worker.decorators.ts) and register them.
 *
 * Heavily inspired from [`BullExplorer`](https://github.com/nestjs/bull/blob/c230eab1dc26fb743a3428e61043167866b1e377/lib/bull.explorer.ts)
 */
@Injectable()
export class ListenerExplorerService implements OnModuleInit {
  private readonly logger = new Logger(ListenerExplorerService.name);

  public readonly listeners: { event: WorkerEventName; callback: Function }[] =
    [];

  private resolveInitialized: () => void = () => {};

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: MetadataAccessorService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onModuleInit() {
    this.explore();
  }

  async ensureInitialized(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveInitialized = resolve;
    });
  }

  explore() {
    const providers: InstanceWrapper[] = this.discoveryService
      .getProviders()
      .filter((wrapper: InstanceWrapper) =>
        this.metadataAccessor.isListener(wrapper.metatype),
      );

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (key: string) => {
          if (this.metadataAccessor.isWorkerEvent(instance[key])) {
            const event = this.metadataAccessor.getListenerMetadata(
              instance[key],
            );

            if (event === undefined) return;

            this.listeners.push({
              event,
              callback: (...args: unknown[]) => instance[key](...args),
            });

            this.logger.debug(
              `Register ${event} from ${
                (instance as Object).constructor.name
              }.${key}`,
            );
          }
        },
      );

      if (this.resolveInitialized instanceof Function) {
        this.resolveInitialized();
      }
    });
  }
}
