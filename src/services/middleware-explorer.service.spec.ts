import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JobHelpers } from 'graphile-worker';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import { Middleware } from '../decorators/middleware.decorators';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';
import { MetadataAccessorService } from './metadata-accessor.service';
import { MiddlewareExplorerService } from './middleware-explorer.service';

@Injectable()
@Middleware('firstGlobal', { global: true })
class TestFirstGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.order = payload.order || [];
    payload.order.push('first');
    await next(payload);
  }
}

@Injectable()
@Middleware('secondGlobal', { global: true })
class TestSecondGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.order = payload.order || [];
    payload.order.push('second');
    await next(payload);
  }
}

@Injectable()
@Middleware('firstNotGlobal')
class TestFirstNotGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.firstNotGlobal = true;
    await next(payload);
  }
}

@Injectable()
@Middleware('secondNotGlobal')
class TestSecondNotGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.secondNotGlobal = true;
    await next(payload);
  }
}

@Injectable()
@Middleware('invalidMiddleware', { global: true })
class TestInvalidUseMethodMiddleware implements MiddlewareProvider {
  // Missing 'next' parameter - should cause runtime error at module init
  async use(payload: any, _helpers: JobHelpers) {
    payload.invalid = true;
  }
}

@Injectable()
@Middleware('instanceFieldMiddleware')
class TestInstanceFieldMiddleware implements MiddlewareProvider {
  private readonly instanceProperty = 'middleware-instance-value';
  public publicField = 'public-field-value';

  async use(payload: any, _helpers: JobHelpers, next: Function) {
    // Verify that 'this' context is properly bound and instance fields are accessible
    payload.instanceProperty = this.instanceProperty;
    payload.publicField = this.publicField;
    payload.hasThisContext = this !== undefined;
    await next(payload);
  }
}

// Not a middleware class (no decorator)
@Injectable()
class TestNotMiddleware {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    await next(payload);
  }
}

describe('MiddlewareExplorerService', () => {
  let service: MiddlewareExplorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        MiddlewareExplorerService,
        MetadataAccessorService,
        TestFirstGlobalMiddleware,
        TestSecondGlobalMiddleware,
        TestFirstNotGlobalMiddleware,
        TestSecondNotGlobalMiddleware,
        TestInstanceFieldMiddleware,
        TestNotMiddleware,
      ],
    }).compile();

    service = module.get(MiddlewareExplorerService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  it('should register all middlewares and middlewares only', () => {
    const registeredIds = service.registeredMiddlewareIds;

    assert.strictEqual(registeredIds.length, 5);
    assert.ok(registeredIds.includes('firstGlobal'));
    assert.ok(registeredIds.includes('secondGlobal'));
    assert.ok(registeredIds.includes('firstNotGlobal'));
    assert.ok(registeredIds.includes('secondNotGlobal'));
    assert.ok(registeredIds.includes('instanceFieldMiddleware'));
  });

  it('should get global middlewares', () => {
    const globalMiddlewares = service.globalMiddlewares;

    assert.strictEqual(globalMiddlewares.length, 2);
    assert.strictEqual(globalMiddlewares[0].name, 'firstGlobal');
    assert.strictEqual(globalMiddlewares[1].name, 'secondGlobal');
  });

  describe('invalid middleware validation', () => {
    it('should throw an error when middleware has invalid use method implementation', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [DiscoveryModule],
        providers: [
          MiddlewareExplorerService,
          MetadataAccessorService,
          TestInvalidUseMethodMiddleware,
        ],
      }).compile();

      module.useLogger({ error: mock.fn() } as any);

      const invalidService = module.get(MiddlewareExplorerService);

      assert.throws(
        () => {
          invalidService.onModuleInit();
        },
        {
          name: 'Error',
          message: 'Middleware TestInvalidUseMethodMiddleware is not valid',
        },
      );
    });
  });

  describe('middlewares by ID', () => {
    it('should get middlewares by ID', () => {
      const firstNotGlobalMiddleware =
        service.getMiddlewareById('firstNotGlobal');
      assert.ok(firstNotGlobalMiddleware);
      assert.strictEqual(firstNotGlobalMiddleware.name, 'firstNotGlobal');
    });

    it('should return undefined for non-existent middleware', () => {
      const nonExistent = service.getMiddlewareById('nonExistent');
      assert.strictEqual(nonExistent, undefined);
    });

    it('should get multiple middlewares by IDs', () => {
      const middlewares = service.getMiddlewaresByIds([
        'firstNotGlobal',
        'firstGlobal',
      ]);
      assert.strictEqual(middlewares.length, 2);
      assert.strictEqual(middlewares[0].name, 'firstNotGlobal');
      assert.strictEqual(middlewares[1].name, 'firstGlobal');
    });

    it('should throw error when getting non-existent middlewares', () => {
      assert.throws(
        () => {
          service.getMiddlewaresByIds([
            'firstNotGlobal',
            'nonExistent',
            'firstGlobal',
          ]);
        },
        {
          name: 'Error',
          message: /Middleware\(s\) not found: \[nonExistent\]/,
        },
      );
    });

    it('should get middleware IDs from middleware functions', () => {
      const middlewares = service.getMiddlewaresByIds([
        'firstNotGlobal',
        'firstGlobal',
      ]);
      const ids = service.getMiddlewareIds(middlewares);

      assert.strictEqual(ids.length, 2);
      assert.strictEqual(ids[0], 'firstNotGlobal');
      assert.strictEqual(ids[1], 'firstGlobal');
    });

    it('should preserve instance context and access instance fields', async () => {
      const middlewareFunction = service.getMiddlewareById(
        'instanceFieldMiddleware',
      );
      assert.ok(middlewareFunction, 'Middleware function should be found');

      const payload: any = {};
      const helpers: any = {};
      let nextCalled = false;

      const next = async (modifiedPayload: any) => {
        nextCalled = true;
        // Verify that the middleware had access to its instance fields
        assert.strictEqual(
          modifiedPayload.instanceProperty,
          'middleware-instance-value',
        );
        assert.strictEqual(modifiedPayload.publicField, 'public-field-value');
        assert.strictEqual(modifiedPayload.hasThisContext, true);
      };

      await middlewareFunction(payload, helpers, next);
      assert.strictEqual(nextCalled, true);
    });
  });

  describe('Middleware ID Uniqueness', () => {
    @Injectable()
    @Middleware('duplicateId')
    class FirstDuplicateMiddleware implements MiddlewareProvider {
      async use(payload: any, _helpers: JobHelpers, next: Function) {
        await next(payload);
      }
    }

    @Injectable()
    @Middleware('duplicateId')
    class SecondDuplicateMiddleware implements MiddlewareProvider {
      async use(payload: any, _helpers: JobHelpers, next: Function) {
        await next(payload);
      }
    }

    it('should throw an error when duplicate middleware IDs are detected', async () => {
      const module = await Test.createTestingModule({
        imports: [DiscoveryModule],
        providers: [
          MiddlewareExplorerService,
          MetadataAccessorService,
          FirstDuplicateMiddleware,
          SecondDuplicateMiddleware,
        ],
      }).compile();

      module.useLogger({ error: mock.fn() } as any);

      const service = module.get(MiddlewareExplorerService);

      assert.throws(
        () => {
          service.onModuleInit();
        },
        {
          name: 'Error',
          message: 'Middleware SecondDuplicateMiddleware is not valid',
        },
      );
    });
  });
});
