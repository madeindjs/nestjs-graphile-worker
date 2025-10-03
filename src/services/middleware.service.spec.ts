import * as assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { MiddlewareService } from './middleware.service';
import { JobMiddleware } from '../interfaces/module-config.interfaces';

const createMockHelpers = () =>
  ({
    addJob: mock.fn(),
    query: mock.fn(),
    logger: { info: mock.fn(), error: mock.fn() },
  } as any);

describe('MiddlewareService', () => {
  let service: MiddlewareService;

  beforeEach(() => {
    service = new MiddlewareService();
  });

  describe('wrapTaskHandler', () => {
    it('should execute task handler without middleware', async () => {
      const originalHandler = mock.fn(() => Promise.resolve());
      const payload = { test: 'data' };
      const helpers = createMockHelpers();

      const wrappedHandler = service.wrapTaskHandler(originalHandler, []);
      await wrappedHandler(payload, helpers);

      assert.strictEqual(originalHandler.mock.callCount(), 1);
      assert.deepStrictEqual(originalHandler.mock.calls[0]?.arguments, [
        payload,
        helpers,
      ]);
    });

    it('should execute middlewares in order', async () => {
      const executionOrder: string[] = [];
      const originalHandler = mock.fn(() => {
        executionOrder.push('handler');
        return Promise.resolve();
      });

      const middleware1: JobMiddleware = async (payload, helpers, next) => {
        executionOrder.push('middleware1-start');
        await next(payload);
        executionOrder.push('middleware1-end');
      };

      const middleware2: JobMiddleware = async (payload, helpers, next) => {
        executionOrder.push('middleware2-start');
        await next(payload);
        executionOrder.push('middleware2-end');
      };

      const wrappedHandler = service.wrapTaskHandler(originalHandler, [
        middleware1,
        middleware2,
      ]);
      await wrappedHandler({ test: 'data' }, createMockHelpers());

      assert.deepStrictEqual(executionOrder, [
        'middleware1-start',
        'middleware2-start',
        'handler',
        'middleware2-end',
        'middleware1-end',
      ]);
    });

    it('should allow payload modification', async () => {
      let receivedPayload: any;
      const originalHandler = mock.fn((payload: any) => {
        receivedPayload = payload;
        return Promise.resolve();
      });

      const middleware: JobMiddleware = async (payload, helpers, next) => {
        const modifiedPayload = { ...payload, modified: true };
        await next(modifiedPayload);
      };

      const wrappedHandler = service.wrapTaskHandler(originalHandler, [
        middleware,
      ]);
      await wrappedHandler({ test: 'data' }, createMockHelpers());

      assert.strictEqual(originalHandler.mock.callCount(), 1);
      assert.deepStrictEqual(receivedPayload, {
        test: 'data',
        modified: true,
      });
    });

    it('should propagate errors from middleware', async () => {
      const originalHandler = mock.fn(() => Promise.resolve());
      const error = new Error('Middleware error');

      const middleware: JobMiddleware = async () => {
        throw error;
      };

      const wrappedHandler = service.wrapTaskHandler(originalHandler, [
        middleware,
      ]);

      await assert.rejects(
        () => wrappedHandler({ test: 'data' }, createMockHelpers()),
        /Middleware error/,
      );
      assert.strictEqual(originalHandler.mock.callCount(), 0);
    });

    it('should propagate errors from handler', async () => {
      const error = new Error('Handler error');
      const originalHandler = mock.fn(() => Promise.reject(error));

      const middleware: JobMiddleware = async (payload, helpers, next) => {
        await next(payload);
      };

      const wrappedHandler = service.wrapTaskHandler(originalHandler, [
        middleware,
      ]);

      await assert.rejects(
        () => wrappedHandler({ test: 'data' }, createMockHelpers()),
        /Handler error/,
      );
    });
  });
});
