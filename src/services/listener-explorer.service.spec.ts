import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GraphileWorkerListener,
  OnWorkerEvent,
} from '../decorators/worker.decorators';
import { ListenerExplorerService } from './listener-explorer.service';
import { MetadataAccessorService } from './metadata-accessor.service';

@Injectable()
@GraphileWorkerListener()
class TestListenerService {
  @OnWorkerEvent('job:success')
  onJobSuccess() {
    return 'job:success';
  }

  @OnWorkerEvent('job:error')
  onJobError() {
    return 'job:error';
  }
}

describe(ListenerExplorerService.name, () => {
  let service: ListenerExplorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        ListenerExplorerService,
        MetadataAccessorService,
        TestListenerService,
      ],
    }).compile();

    service = module.get<ListenerExplorerService>(ListenerExplorerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register TestListenerService', () => {
      service.onModuleInit();
      expect(service.listeners).toHaveLength(2);

      const eventsRegistered = service.listeners.map((l) => l.event);

      expect(eventsRegistered).toContain('job:success');
      expect(eventsRegistered).toContain('job:error');

      const successHandler = service.listeners.find(
        ({ event }) => event === 'job:success',
      );
      expect(successHandler.callback()).toEqual('job:success');

      const errorHandler = service.listeners.find(
        ({ event }) => event === 'job:error',
      );
      expect(errorHandler.callback()).toEqual('job:error');
    });
  });
});
