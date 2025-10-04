import { Injectable } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JobHelpers } from 'graphile-worker';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { Middleware } from '../decorators/middleware.decorators';
import { Task, TaskHandler } from '../decorators/task.decorators';
import {
  GraphileWorkerListener,
  OnWorkerEvent,
} from '../decorators/worker.decorators';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';
import { MetadataAccessorService } from './metadata-accessor.service';

@Injectable()
@GraphileWorkerListener()
class TestListenerService {
  @OnWorkerEvent('job:success')
  onJobSuccess() {}

  @OnWorkerEvent('job:error')
  onJobError() {}

  notListener() {}
}

@Injectable()
class TestNotListenerService {
  onJobSuccess() {}
  onJobError() {}
}

@Injectable()
@Task('test-task')
class TestTaskService {
  @TaskHandler()
  handler() {}

  notHandler() {}
}

@Injectable()
@Middleware({ global: true })
class TestGlobalMiddleware implements MiddlewareProvider {
  async use(
    payload: any,
    _helpers: JobHelpers,
    next: (payload?: any) => Promise<void>,
  ): Promise<void> {
    await next(payload);
  }
}

@Injectable()
@Middleware()
class TestMiddleware implements MiddlewareProvider {
  async use(
    payload: any,
    _helpers: JobHelpers,
    next: (payload?: any) => Promise<void>,
  ): Promise<void> {
    await next(payload);
  }
}

@Injectable()
class TestNotMiddleware {
  use() {}
}

describe(MetadataAccessorService.name, () => {
  let service: MetadataAccessorService;
  let testListener: TestListenerService;
  let testNotListener: TestNotListenerService;
  let testTask: TestTaskService;
  let testGlobalMiddleware: TestGlobalMiddleware;
  let testMiddleware: TestMiddleware;
  let testNotMiddleware: TestNotMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        MetadataAccessorService,
        Reflector,
        TestListenerService,
        TestNotListenerService,
        TestTaskService,
        TestGlobalMiddleware,
        TestMiddleware,
        TestNotMiddleware,
      ],
    }).compile();

    service = module.get(MetadataAccessorService);
    testListener = module.get(TestListenerService);
    testNotListener = module.get(TestNotListenerService);
    testTask = module.get(TestTaskService);
    testGlobalMiddleware = module.get(TestGlobalMiddleware);
    testMiddleware = module.get(TestMiddleware);
    testNotMiddleware = module.get(TestNotMiddleware);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('isListener', () => {
    it.skip('should get valid', () => {
      assert.ok(service.isListener(testListener.onJobSuccess));
      assert.ok(service.isListener(testListener.onJobError));
    });

    it('should get invalid', () => {
      assert.equal(service.isListener(testListener.notListener), false);
      assert.equal(service.isListener(testNotListener.onJobSuccess), false);
      assert.equal(service.isListener(testNotListener.onJobError), false);
    });
  });

  describe('isWorkerEvent', () => {
    it('should get valid', () => {
      assert.ok(service.isWorkerEvent(testListener.onJobSuccess));
      assert.ok(service.isWorkerEvent(testListener.onJobError));
    });

    it('should get invalid', () => {
      assert.strictEqual(
        service.isWorkerEvent(testListener.notListener),
        false,
      );
      assert.strictEqual(
        service.isWorkerEvent(testNotListener.onJobSuccess),
        false,
      );
      assert.strictEqual(
        service.isWorkerEvent(testNotListener.onJobError),
        false,
      );
    });
  });

  describe('getListenerMetadata', () => {
    it('should get valid', () => {
      assert.strictEqual(
        service.getListenerMetadata(testListener.onJobSuccess),
        'job:success',
      );
      assert.strictEqual(
        service.getListenerMetadata(testListener.onJobError),
        'job:error',
      );
    });

    it('should get invalid', () => {
      assert.strictEqual(
        service.getListenerMetadata(testListener.notListener),
        undefined,
      );
      assert.strictEqual(
        service.getListenerMetadata(testNotListener.onJobSuccess),
        undefined,
      );
      assert.strictEqual(
        service.getListenerMetadata(testNotListener.onJobError),
        undefined,
      );
    });
  });

  describe('Task decorators', () => {
    describe('isTask', () => {
      it('should detect task classes', () => {
        assert.strictEqual(service.isTask(TestTaskService), true);
      });

      it('should not detect non-task classes', () => {
        assert.strictEqual(service.isTask(TestNotMiddleware), false);
      });
    });

    describe('isTaskHandler', () => {
      it('should detect task handler methods', () => {
        assert.strictEqual(service.isTaskHandler(testTask.handler), true);
      });

      it('should not detect non-handler methods', () => {
        assert.strictEqual(service.isTaskHandler(testTask.notHandler), false);
      });
    });

    describe('getTaskMetadata', () => {
      it('should get task metadata', () => {
        assert.strictEqual(
          service.getTaskMetadata(TestTaskService),
          'test-task',
        );
      });

      it('should return undefined for non-task classes', () => {
        assert.strictEqual(
          service.getTaskMetadata(TestNotMiddleware),
          undefined,
        );
      });
    });
  });

  describe('Middleware decorators', () => {
    describe('isMiddleware', () => {
      it('should detect middleware classes', () => {
        assert.strictEqual(service.isMiddleware(TestGlobalMiddleware), true);
        assert.strictEqual(service.isMiddleware(TestMiddleware), true);
      });

      it('should not detect non-middleware classes', () => {
        assert.strictEqual(service.isMiddleware(TestNotMiddleware), false);
        assert.strictEqual(service.isMiddleware(TestTaskService), false);
      });
    });

    describe('getMiddlewareMetadata', () => {
      it('should get global middleware metadata', () => {
        const metadata = service.getMiddlewareMetadata(TestGlobalMiddleware);
        assert.deepStrictEqual(metadata, { global: true });
      });

      it('should get regular middleware metadata', () => {
        const metadata = service.getMiddlewareMetadata(TestMiddleware);
        assert.deepStrictEqual(metadata, {});
      });

      it('should return undefined for non-middleware classes', () => {
        assert.strictEqual(
          service.getMiddlewareMetadata(TestNotMiddleware),
          undefined,
        );
      });
    });
  });
});
