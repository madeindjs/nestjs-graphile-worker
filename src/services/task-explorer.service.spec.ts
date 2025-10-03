import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { Task, TaskHandler } from '../decorators/task.decorators';
import {
  RUNNER_OPTIONS_KEY,
  GLOBAL_JOB_MIDDLEWARES_KEY,
} from '../interfaces/module-config.interfaces';
import { MetadataAccessorService } from './metadata-accessor.service';
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

describe(TaskExplorerService.name, () => {
  let service: TaskExplorerService;

  const createTestingModule = async (middlewares: any[] = []) => {
    return Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        TaskExplorerService,
        MetadataAccessorService,
        MiddlewareService,
        HelloTask,
        {
          provide: RUNNER_OPTIONS_KEY,
          useValue: {
            connectionString: 'test',
            events: {},
          },
        },
        {
          provide: GLOBAL_JOB_MIDDLEWARES_KEY,
          useValue: middlewares,
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
    it('should register TestListenerService', async () => {
      service.onModuleInit();
      assert.ok(service.taskList.hello);
      const result = await service.taskList.hello({}, {} as any);
      assert.strictEqual(result, undefined);
    });
  });

  describe('middleware registration', () => {
    it('should register middlewares', async () => {
      const executionOrder: string[] = [];

      const middleware1 = async (payload: any, helpers: any, next: any) => {
        executionOrder.push('middleware1');
        await next();
      };

      const middleware2 = async (payload: any, helpers: any, next: any) => {
        executionOrder.push('middleware2');
        await next();
      };

      const moduleWithMiddlewares = await createTestingModule([
        middleware1,
        middleware2,
      ]);
      const serviceWithMiddlewares =
        moduleWithMiddlewares.get(TaskExplorerService);
      serviceWithMiddlewares.onModuleInit();

      assert.ok(serviceWithMiddlewares.taskList.hello);

      await serviceWithMiddlewares.taskList.hello({}, {} as any);

      assert.deepStrictEqual(executionOrder, ['middleware1', 'middleware2']);
    });
  });
});
