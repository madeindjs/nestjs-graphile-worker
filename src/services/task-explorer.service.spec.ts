import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JobHelpers } from 'graphile-worker';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  Middleware,
  UseMiddlewares,
} from '../decorators/middleware.decorators';
import { Task, TaskHandler } from '../decorators/task.decorators';
import { MiddlewareProvider } from '../interfaces/middleware.interfaces';
import { RUNNER_OPTIONS_KEY } from '../interfaces/module-config.interfaces';
import { MetadataAccessorService } from './metadata-accessor.service';
import { MiddlewareExplorerService } from './middleware-explorer.service';
import { MiddlewareService } from './middleware.service';
import { TaskExplorerService } from './task-explorer.service';

@Injectable()
@Task('hello')
class HelloTask {
  @TaskHandler()
  async handler() {
    return 'hello';
  }
}

@Injectable()
@Middleware('testMiddleware', { global: true })
class TestMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.middlewareApplied = true;
    await next(payload);
  }
}

@Injectable()
@Task('taskWithMissingMiddleware')
class TaskWithMissingMiddleware {
  @UseMiddlewares(['nonExistentMiddleware'])
  @TaskHandler()
  async handler() {
    return 'should not be reached';
  }
}

@Injectable()
@Task('instanceFieldTask')
class InstanceFieldTask {
  private readonly instanceProperty = 'task-instance-value';
  public publicField = 'task-public-field';

  @TaskHandler()
  async handler(payload: any, _helpers: JobHelpers) {
    // Verify that 'this' context is properly bound and instance fields are accessible
    // Store results in payload since task handlers don't return values directly
    payload.result = 'success';
    payload.instanceProperty = this.instanceProperty;
    payload.publicField = this.publicField;
    payload.hasThisContext = this !== undefined;
  }
}

describe(TaskExplorerService.name, () => {
  let service: TaskExplorerService;

  const createTestingModule = async () => {
    return Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        TaskExplorerService,
        MetadataAccessorService,
        MiddlewareExplorerService,
        MiddlewareService,
        HelloTask,
        InstanceFieldTask,
        TestMiddleware,
        {
          provide: RUNNER_OPTIONS_KEY,
          useValue: {
            connectionString: 'test',
            events: {},
          },
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createTestingModule();
    service = module.get(TaskExplorerService);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('onModuleInit', () => {
    it('should register HelloTask', async () => {
      service.onModuleInit();
      assert.ok(service.taskList.hello);
      const result = await service.taskList.hello({}, {} as any);
      assert.strictEqual(result, undefined);
    });

    it('should register tasks with middlewares applied', async () => {
      service.onModuleInit();
      assert.ok(service.taskList.hello);

      const payload: any = { test: true };
      const helpers: any = {};

      await service.taskList.hello(payload, helpers);

      assert.strictEqual(payload.middlewareApplied, true);
    });

    it('should throw error when task references non-existent middleware', async () => {
      const moduleWithMissingMiddleware = await Test.createTestingModule({
        imports: [DiscoveryModule],
        providers: [
          TaskExplorerService,
          MetadataAccessorService,
          MiddlewareExplorerService,
          MiddlewareService,
          TaskWithMissingMiddleware,
        ],
      }).compile();

      const serviceWithMissingMiddleware =
        moduleWithMissingMiddleware.get(TaskExplorerService);

      assert.throws(
        () => {
          serviceWithMissingMiddleware.onModuleInit();
        },
        {
          name: 'Error',
          message: /Middleware\(s\) not found: \[nonExistentMiddleware\]/,
        },
      );
    });

    it('should preserve instance context and access instance fields in task handlers', async () => {
      service.onModuleInit();
      assert.ok(service.taskList.instanceFieldTask);

      const payload: any = { test: 'data' };
      const helpers = {} as any;

      await service.taskList.instanceFieldTask(payload, helpers);

      // Verify that the task handler had access to its instance fields
      assert.strictEqual(payload.result, 'success');
      assert.strictEqual(payload.instanceProperty, 'task-instance-value');
      assert.strictEqual(payload.publicField, 'task-public-field');
      assert.strictEqual(payload.hasThisContext, true);
      assert.strictEqual(payload.test, 'data'); // Original payload data should still be there
    });
  });
});
