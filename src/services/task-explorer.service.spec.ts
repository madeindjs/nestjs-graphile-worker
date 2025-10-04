import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JobHelpers } from 'graphile-worker';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { Middleware } from '../decorators/middleware.decorators';
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
@Middleware({ global: true })
class TestMiddleware implements MiddlewareProvider {
  async use(payload: any, _helpers: JobHelpers, next: Function) {
    payload.middlewareApplied = true;
    await next(payload);
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
  });
});
