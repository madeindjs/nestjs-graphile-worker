import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Task, TaskHandler } from '../decorators/task.decorators';
import { MetadataAccessorService } from './metadata-accessor.service';
import { TaskExplorerService } from './task-explorer.service';

@Injectable()
@Task('hello')
class HelloTask {
  @TaskHandler()
  handler() {
    return 'hello';
  }
}

describe(TaskExplorerService.name, () => {
  let service: TaskExplorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [TaskExplorerService, MetadataAccessorService, HelloTask],
    }).compile();

    service = module.get(TaskExplorerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register TestListenerService', () => {
      service.onModuleInit();
      expect(service.taskList.hello).toBeDefined;
      expect(service.taskList.hello({}, undefined)).toEqual('hello');
    });
  });
});
