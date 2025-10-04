import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

import { JobMiddleware } from '../interfaces/module-config.interfaces';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';
import { MetadataAccessorService } from './metadata-accessor.service';

/**
 * Service responsible for discovering and registering middleware classes
 */
@Injectable()
export class MiddlewareExplorerService implements OnModuleInit {
  private readonly logger = new Logger(MiddlewareExplorerService.name);

  private readonly _globalMiddlewares: JobMiddleware[] = [];
  private _explored = false;

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataAccessor: MetadataAccessorService,
  ) {}

  onModuleInit() {
    this.explore();
  }

  /**
   * Get all global middlewares discovered from decorated classes
   */
  get globalMiddlewares(): JobMiddleware[] {
    // Ensure exploration has happened
    if (!this._explored) {
      this.explore();
    }
    return [...this._globalMiddlewares];
  }

  private explore() {
    const providers: InstanceWrapper[] = this.discoveryService
      .getProviders()
      .filter((wrapper: InstanceWrapper) =>
        this.metadataAccessor.isMiddleware(wrapper.metatype),
      );

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance, metatype } = wrapper;

      if (!this.isValidMiddlewareProvider(instance)) {
        this.logger.warn(
          `Middleware class ${
            metatype?.name || 'Unknown'
          } does not implement the 'use' method. Skipping.`,
        );
        return;
      }

      const options = this.metadataAccessor.getMiddlewareMetadata(metatype);

      if (options?.global) {
        // Convert the middleware provider to a JobMiddleware function
        const middlewareFunction: JobMiddleware = async (
          payload,
          helpers,
          next,
        ) => {
          return await instance.use(payload, helpers, next);
        };

        // Preserve the class name for debugging
        Object.defineProperty(middlewareFunction, 'name', {
          value: `${metatype?.name || 'AnonymousMiddleware'}.use`,
          configurable: true,
        });

        this._globalMiddlewares.push(middlewareFunction);
      }
    });

    if (this._globalMiddlewares.length > 0) {
      const middlewareNames = this._globalMiddlewares
        .map((mw) => mw.name || 'anonymous')
        .join(', ');
      this.logger.debug(
        `Registered ${this._globalMiddlewares.length} global middleware(s): [${middlewareNames}]`,
      );
    } else {
      this.logger.debug('No global middlewares registered');
    }

    this._explored = true;
  }

  private isValidMiddlewareProvider(
    instance: any,
  ): instance is MiddlewareProvider {
    if (!instance || typeof instance.use !== 'function') {
      return false;
    }

    /* Check that the use method has the correct number of parameters.
     * This runtime validation is important as Typescript doesn't report any
     * typing error if we implement a function with fewer parameters than
     * expected.
     */
    const useMethod = instance.use;
    if (useMethod.length < 3) {
      this.logger.error(
        `Middleware class ${
          instance.constructor?.name || 'Unknown'
        } has a 'use' method with ${
          useMethod.length
        } parameter(s), but it must have exactly 3 parameters: (payload, helpers, next).`,
      );
      return false;
    }

    return true;
  }
}
