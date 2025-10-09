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
@Middleware({ global: true })
class TestFirstGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.order = payload.order || [];
    payload.order.push('first');
    await next(payload);
  }
}

@Injectable()
@Middleware({ global: true })
class TestSecondGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.order = payload.order || [];
    payload.order.push('second');
    await next(payload);
  }
}

@Injectable()
@Middleware()
class TestFirstNotGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.firstNotGlobal = true;
    await next(payload);
  }
}

@Injectable()
@Middleware()
class TestSecondNotGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.secondNotGlobal = true;
    await next(payload);
  }
}

@Injectable()
@Injectable()
@Middleware()
class TestInvalidUseMethodMiddleware implements MiddlewareProvider {
  // Missing 'next' parameter - should cause runtime error at module init
  async use(payload: any, _helpers: JobHelpers) {
    payload.invalid = true;
  }
}

@Injectable()
@Middleware()
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
    const allMiddlewares = service.getMiddlewaresByClasses([
      TestFirstGlobalMiddleware,
      TestSecondGlobalMiddleware,
      TestFirstNotGlobalMiddleware,
      TestSecondNotGlobalMiddleware,
      TestInstanceFieldMiddleware,
    ]);
    assert.strictEqual(allMiddlewares.length, 5);
    assert.strictEqual(service.globalMiddlewareClasses.length, 2);
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

  describe('middlewares by classes', () => {
    it('should get multiple middlewares by classes', () => {
      const middlewares = service.getMiddlewaresByClasses([
        TestFirstNotGlobalMiddleware,
        TestFirstGlobalMiddleware,
      ]);
      assert.strictEqual(middlewares.length, 2);
      assert.strictEqual(middlewares[0].name, 'TestFirstNotGlobalMiddleware');
      assert.strictEqual(middlewares[1].name, 'TestFirstGlobalMiddleware');
    });

    it('should throw error when getting non-existent middlewares', () => {
      class NonExistentMiddleware {}

      assert.throws(
        () => {
          service.getMiddlewaresByClasses([
            TestFirstNotGlobalMiddleware,
            NonExistentMiddleware as any,
            TestFirstGlobalMiddleware,
          ]);
        },
        {
          name: 'Error',
          message:
            /Middleware class\(es\) not found: \[NonExistentMiddleware\]/,
        },
      );
    });

    it('should preserve instance context and access instance fields', async () => {
      const middlewares = service.getMiddlewaresByClasses([
        TestInstanceFieldMiddleware,
      ]);
      assert.strictEqual(middlewares.length, 1);
      const middlewareFunction = middlewares[0];
      assert.ok(middlewareFunction, 'Middleware function should be found');

      const payload: any = {};
      const helpers: any = {};
      let nextCalled = false;

      const next = async (modifiedPayload: any) => {
        nextCalled = true;
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
});
