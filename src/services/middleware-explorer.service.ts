import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

import { MiddlewareClass } from '../decorators/middleware.decorators';
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
    Type,
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
   * Get all global middleware classes
   */
  get globalMiddlewareClasses(): MiddlewareClass[] {
    // Ensure exploration has happened
    if (!this._explored) {
      this.explore();
    }
    return Array.from(this._middlewares.entries())
      .filter(([, { isGlobal }]) => isGlobal)
      .map(([middlewareClass]) => middlewareClass);
  }

  /**
   * Get multiple middlewares by their classes
   * @throws Error if any middleware class is not found
   */
  getMiddlewaresByClasses(
    middlewareClasses: MiddlewareClass[],
  ): JobMiddleware[] {
    // Ensure exploration has happened
    if (!this._explored) {
      this.explore();
    }

    // Check for missing middlewares
    const missingClasses = middlewareClasses.filter(
      (cls) => !this._middlewares.has(cls),
    );

    if (missingClasses.length > 0) {
      const missingNames = missingClasses.map((cls) => cls.name).join(', ');
      const availableNames = Array.from(this._middlewares.keys())
        .map((cls) => cls.name)
        .join(', ');
      throw new Error(
        `Middleware class(es) not found: [${missingNames}]. 
        Available middleware classes: [${availableNames}]`,
      );
    }

    return middlewareClasses.map((cls) => {
      return this._middlewares.get(cls)!.middlewareFn;
    });
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

      if (!this.isValidMiddleware(instance, metatype)) {
        throw new Error(
          `Middleware ${metatype?.name || 'Unknown'} is not valid`,
        );
      }

      const middlewareFunction = this.getMiddlewareFunction(
        instance,
        metatype.name,
      );
      const options = this.metadataAccessor.getMiddlewareMetadata(metatype);

      this._middlewares.set(metatype as Type, {
        middlewareFn: middlewareFunction,
        isGlobal: options?.global || false,
      });
    }

    this.logMiddlewareRegistration();
  }

  private isValidMiddleware(instance: any, metatype: any): boolean {
    // Check if instance has a valid use method
    if (!instance || typeof instance.use !== 'function') {
      this.logger.error(
        `Middleware '${
          metatype?.name || 'Unknown'
        }' does not implement the 'use' method correctly. \
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

    const middlewareNames = Array.from(this._middlewares.keys())
      .map((cls) => cls.name)
      .join(', ');
    this.logger.debug(
      `Registered ${this._middlewares.size} middlewares: [${middlewareNames}]`,
    );

    const globalMiddlewareNames = Array.from(this._middlewares.entries())
      .filter(([, { isGlobal }]) => isGlobal)
      .map(([cls]) => cls.name);

    if (globalMiddlewareNames.length > 0) {
      this.logger.debug(
        `The following middlewares are global: [${globalMiddlewareNames.join(
          ', ',
        )}]`,
      );
    }
  }
}
