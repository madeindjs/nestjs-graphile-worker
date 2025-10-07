import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

import { MiddlewareMetadata } from '../decorators/middleware.decorators';
import { JobMiddleware } from '../interfaces/module-config.interfaces';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';
import { MetadataAccessorService } from './metadata-accessor.service';

/**
 * Service responsible for discovering and registering middleware classes
 */
@Injectable()
export class MiddlewareExplorerService implements OnModuleInit {
  private readonly logger = new Logger(MiddlewareExplorerService.name);

  private readonly _middlewares = new Map<
    string,
    { middlewareFn: JobMiddleware; isGlobal: boolean }
  >();
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
    return Array.from(this._middlewares.values())
      .filter(({ isGlobal }) => isGlobal)
      .map(({ middlewareFn }) => middlewareFn);
  }

  /**
   * Get all registered middleware IDs
   */
  get registeredMiddlewareIds(): string[] {
    // Ensure exploration has happened
    if (!this._explored) {
      this.explore();
    }
    return Array.from(this._middlewares.keys());
  }

  /**
   * Get a middleware by its ID
   */
  getMiddlewareById(id: string): JobMiddleware | undefined {
    // Ensure exploration has happened
    if (!this._explored) {
      this.explore();
    }
    return this._middlewares.get(id)?.middlewareFn;
  }

  /**
   * Get multiple middlewares by their IDs
   * @throws Error if any middleware ID is not found
   */
  getMiddlewaresByIds(ids: string[]): JobMiddleware[] {
    // Ensure exploration has happened
    if (!this._explored) {
      this.explore();
    }

    // Check for missing middlewares
    const missingIds = ids.filter((id) => !this._middlewares.has(id));

    if (missingIds.length > 0) {
      throw new Error(
        `Middleware(s) not found: [${missingIds.join(', ')}]. 
        Available middlewares: [${this.registeredMiddlewareIds.join(', ')}]`,
      );
    }

    return ids.map((id) => this._middlewares.get(id)!.middlewareFn);
  }

  /**
   * Get the IDs of multiple middlewares
   */
  getMiddlewareIds(middlewares: JobMiddleware[]): string[] {
    return middlewares.map((middleware) => middleware.name);
  }

  private explore() {
    if (this._explored) {
      return;
    }

    this._explored = true;

    const providers: InstanceWrapper[] = this.discoveryService.getProviders();

    for (const provider of providers) {
      if (!this.metadataAccessor.isMiddleware(provider.metatype)) {
        continue;
      }

      const { instance, metatype } = provider;

      const options = this.metadataAccessor.getMiddlewareMetadata(metatype);

      if (!this.isValidMiddleware(instance, options, metatype)) {
        throw new Error(
          `Middleware ${metatype?.name || 'Unknown'} is not valid`,
        );
      }

      const middlewareFunction = this.getMiddlewareFunction(
        instance,
        options.id,
      );

      this._middlewares.set(options.id, {
        middlewareFn: middlewareFunction,
        isGlobal: options.global || false,
      });
    }

    this.logMiddlewareRegistration();
  }

  private isValidMiddleware(
    instance: any,
    options: MiddlewareMetadata | undefined,
    metatype: any,
  ): options is MiddlewareMetadata {
    // Check if options exist and have an ID
    if (!options?.id) {
      this.logger.error(
        `Middleware class ${
          metatype?.name || 'Unknown'
        } does not have an ID. All middlewares must have a unique ID.`,
      );
      return false;
    }

    // Check for duplicate IDs
    if (this._middlewares.has(options.id)) {
      this.logger.error(
        `Duplicate middleware ID '${
          options.id
        }' detected. Middleware IDs must be unique across the entire application. Found in class: ${
          metatype?.name || 'Unknown'
        }`,
      );
      return false;
    }

    // Check if instance has a valid use method
    if (!instance || typeof instance.use !== 'function') {
      this.logger.error(
        `Middleware '${options.id}' does not implement the 'use' method correctly. \
        All middlewares must have a valid 'use' method with exactly 3 parameters: (payload, helpers, next).`,
      );
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

  /**
   * Get the JobMiddleware function from a MiddlewareProvider instance
   */
  private getMiddlewareFunction(
    middlewareProvider: MiddlewareProvider,
    middlewareId: string,
  ): JobMiddleware {
    const middlewareFunction: JobMiddleware = async (
      payload,
      helpers,
      next,
    ) => {
      return await middlewareProvider.use(payload, helpers, next);
    };

    // Add the middleware ID as the function name for debugging
    Object.defineProperty(middlewareFunction, 'name', {
      value: `${middlewareId}`,
      configurable: true,
    });

    return middlewareFunction;
  }

  private logMiddlewareRegistration(): void {
    if (this._middlewares.size === 0) {
      this.logger.debug('No middleware registered');
      return;
    }

    // Log all middlewares
    const middlewareIds = Array.from(this._middlewares.keys()).join(', ');
    this.logger.debug(
      `Registered ${this._middlewares.size} middlewares: [${middlewareIds}]`,
    );

    // Log global middlewares if any
    const globalMiddlewareIds = Array.from(this._middlewares.entries())
      .filter(([, { isGlobal }]) => isGlobal)
      .map(([id]) => id);

    if (globalMiddlewareIds.length > 0) {
      this.logger.debug(
        `The following middlewares are global: [${globalMiddlewareIds.join(
          ', ',
        )}]`,
      );
    }
  }
}
