import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JobHelpers } from 'graphile-worker';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

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
class TestNotGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.local = true;
    await next(payload);
  }
}

@Injectable()
@Middleware({ global: true })
class TestInvalidUseMethodMiddleware implements MiddlewareProvider {
  // Missing 'next' parameter
  async use(payload: any, _helpers: JobHelpers) {
    payload.invalid = true;
  }
}

@Injectable()
class TestNotMiddleware {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    await next(payload);
  }
}

describe('MiddlewareExplorerService', () => {
  let service: MiddlewareExplorerService;
  let testFirstGlobalMiddleware: TestFirstGlobalMiddleware;
  let testLocalMiddleware: TestNotGlobalMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        MiddlewareExplorerService,
        MetadataAccessorService,
        TestFirstGlobalMiddleware,
        TestSecondGlobalMiddleware,
        TestNotGlobalMiddleware,
        TestInvalidUseMethodMiddleware,
        TestNotMiddleware,
      ],
    }).compile();

    service = module.get(MiddlewareExplorerService);
    testFirstGlobalMiddleware = module.get(TestFirstGlobalMiddleware);
    testLocalMiddleware = module.get(TestNotGlobalMiddleware);

    service.onModuleInit();
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('globalMiddlewares', () => {
    it('should register global middlewares', () => {
      const globalMiddlewares = service.globalMiddlewares;

      assert.strictEqual(globalMiddlewares.length, 2);
      assert.strictEqual(
        globalMiddlewares[0].name,
        'TestFirstGlobalMiddleware.use',
      );
      assert.strictEqual(
        globalMiddlewares[1].name,
        'TestSecondGlobalMiddleware.use',
      );
    });

    it("should not include middlewares that don't use the `global` option", () => {
      const globalMiddlewares = service.globalMiddlewares;
      const middlewareNames = globalMiddlewares.map((mw) => mw.name);

      assert.ok(
        !middlewareNames.some((name) =>
          name.includes('TestNotGlobalMiddleware'),
        ),
      );
    });

    it('should not include non-middleware classes', () => {
      const globalMiddlewares = service.globalMiddlewares;

      const middlewareNames = globalMiddlewares.map((mw) => mw.name);
      assert.ok(
        !middlewareNames.some((name) => name.includes('TestNotMiddleware')),
      );
    });

    it('should exclude middlewares with invalid use method implementations', () => {
      const globalMiddlewares = service.globalMiddlewares;
      const middlewareNames = globalMiddlewares.map((mw) => mw.name);

      assert.ok(
        !middlewareNames.some((name) =>
          name.includes('TestInvalidUseMethodMiddleware'),
        ),
        'Invalid middleware should be excluded from global middlewares',
      );
    });
  });

  describe('middleware execution', () => {
    it('should execute global middleware correctly', async () => {
      const globalMiddlewares = service.globalMiddlewares;
      assert.strictEqual(globalMiddlewares.length, 2);

      const middleware = globalMiddlewares[0];
      const payload: any = { test: true };
      const helpers: any = {};
      let nextCalled = false;

      const next = async (modifiedPayload?: any) => {
        nextCalled = true;
        if (modifiedPayload) {
          Object.assign(payload, modifiedPayload);
        }
      };

      await middleware(payload, helpers, next);

      assert.strictEqual(nextCalled, true);
      assert.deepStrictEqual(payload.order, ['first']);
    });

    it('should preserve middleware execution order based on providers array', async () => {
      const globalMiddlewares = service.globalMiddlewares;
      assert.strictEqual(globalMiddlewares.length, 2);

      const payload: any = { test: true };
      const helpers: any = {};
      let middlewareCallCount = 0;

      const next = async (modifiedPayload?: any) => {
        middlewareCallCount++;
        if (modifiedPayload) {
          Object.assign(payload, modifiedPayload);
        }
      };

      await globalMiddlewares[0](payload, helpers, async (p) => {
        await globalMiddlewares[1](p, helpers, next);
      });

      assert.deepStrictEqual(payload.order, ['first', 'second']);
      assert.strictEqual(middlewareCallCount, 1);
    });
  });
});
