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

@Injectable()
@Middleware('bypassedGlobal', { global: true })
class BypassedGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.bypassedGlobalApplied = true;
    await next(payload);
  }
}

@Injectable()
@Middleware('anotherGlobal', { global: true })
class AnotherGlobalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.anotherGlobalApplied = true;
    await next(payload);
  }
}

@Injectable()
@Middleware('localMiddleware')
class LocalMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.localApplied = true;
    await next(payload);
  }
}

@Injectable()
@Task('taskWithBypass')
class TaskWithBypass {
  @UseMiddlewares(['localMiddleware'], {
    bypassGlobalMiddlewares: ['bypassedGlobal'],
  })
  @TaskHandler()
  async handler(payload: any, _helpers: JobHelpers) {
    payload.result = 'bypass-test';
  }
}

@Injectable()
@Task('taskWithNonExistentBypass')
class TaskWithNonExistentBypass {
  @UseMiddlewares(['localMiddleware'], {
    bypassGlobalMiddlewares: ['nonExistentGlobal'],
  })
  @TaskHandler()
  async handler(payload: any, _helpers: JobHelpers) {
    payload.result = 'non-existent-bypass-test';
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
        BypassedGlobalMiddleware,
        AnotherGlobalMiddleware,
        LocalMiddleware,
        TaskWithBypass,
        TaskWithNonExistentBypass,
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

    it('should bypass specified global middlewares', async () => {
      service.onModuleInit();
      assert.ok(service.taskList.taskWithBypass);

      const payload: any = { test: 'bypass-data' };
      const helpers = {} as any;

      await service.taskList.taskWithBypass(payload, helpers);

      // Verify that the bypassed global middleware was not applied
      assert.strictEqual(payload.bypassedGlobalApplied, undefined);
      // Verify that other global middleware was still applied
      assert.strictEqual(payload.anotherGlobalApplied, true);
      // Verify that local middleware was applied
      assert.strictEqual(payload.localApplied, true);
      assert.strictEqual(payload.result, 'bypass-test');
    });

    it('should handle non-existent bypassed middlewares gracefully', async () => {
      service.onModuleInit();
      assert.ok(service.taskList.taskWithNonExistentBypass);

      const payload: any = { test: 'non-existent-bypass-data' };
      const helpers = {} as any;

      // This should not throw an error even though 'nonExistentGlobal' doesn't exist
      await service.taskList.taskWithNonExistentBypass(payload, helpers);

      // Verify that existing global middlewares were still applied
      assert.strictEqual(payload.bypassedGlobalApplied, true);
      assert.strictEqual(payload.anotherGlobalApplied, true);
      // Verify that local middleware was applied
      assert.strictEqual(payload.localApplied, true);
      assert.strictEqual(payload.result, 'non-existent-bypass-test');
    });
  });
});
