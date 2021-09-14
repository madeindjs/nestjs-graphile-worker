import { Injectable } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  GraphileWorkerListener,
  OnWorkerEvent,
} from '../decorators/worker-hooks.decorators';
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

describe(MetadataAccessorService.name, () => {
  let service: MetadataAccessorService;
  let testListener: TestListenerService;
  let testNotListener: TestNotListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        MetadataAccessorService,
        Reflector,
        TestListenerService,
        TestNotListenerService,
      ],
    }).compile();

    service = module.get(MetadataAccessorService);
    testListener = module.get(TestListenerService);
    testNotListener = module.get(TestNotListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isListener', () => {
    it('should get valid', () => {
      expect(service.isListener(testListener.onJobSuccess)).toBeTruthy;
      expect(service.isListener(testListener.onJobError)).toBeTruthy;
    });

    it('should get invalid', () => {
      expect(service.isListener(testListener.notListener)).toBeFalsy;
      expect(service.isListener(testNotListener.onJobSuccess)).toBeFalsy;
      expect(service.isListener(testNotListener.onJobError)).toBeFalsy;
    });
  });

  describe('isWorkerEvent', () => {
    it('should get valid', () => {
      expect(service.isWorkerEvent(testListener.onJobSuccess)).toBeTruthy;
      expect(service.isWorkerEvent(testListener.onJobError)).toBeTruthy;
    });

    it('should get invalid', () => {
      expect(service.isWorkerEvent(testListener.notListener)).toBeFalsy;
      expect(service.isWorkerEvent(testNotListener.onJobSuccess)).toBeFalsy;
      expect(service.isWorkerEvent(testNotListener.onJobError)).toBeFalsy;
    });
  });

  describe('getListenerMetadata', () => {
    it('should get valid', () => {
      expect(service.getListenerMetadata(testListener.onJobSuccess)).toEqual(
        'job:success',
      );
      expect(service.getListenerMetadata(testListener.onJobError)).toEqual(
        'job:error',
      );
    });

    it('should get invalid', () => {
      expect(service.getListenerMetadata(testListener.notListener))
        .toBeUndefined;
      expect(service.getListenerMetadata(testNotListener.onJobSuccess))
        .toBeUndefined;
      expect(service.getListenerMetadata(testNotListener.onJobError))
        .toBeUndefined;
    });
  });
});
