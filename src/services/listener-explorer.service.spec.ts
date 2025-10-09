import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
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

@Injectable()
@GraphileWorkerListener()
class TestInstanceFieldListener {
  private readonly instanceProperty = 'listener-instance-value';
  public publicField = 'listener-public-field';

  @OnWorkerEvent('job:complete')
  onJobComplete() {
    // Verify that 'this' context is properly bound and instance fields are accessible
    return {
      event: 'job:complete',
      instanceProperty: this.instanceProperty,
      publicField: this.publicField,
      hasThisContext: this !== undefined,
    };
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
        TestInstanceFieldListener,
      ],
    }).compile();

    service = module.get<ListenerExplorerService>(ListenerExplorerService);
  });

  it('should be defined', () => {
    assert.ok(service);
  });

  describe('onModuleInit', () => {
    it('should register TestListenerService', () => {
      service.onModuleInit();
      assert.strictEqual(service.listeners.length, 3);

      const eventsRegistered = service.listeners.map((l) => l.event);

      assert.ok(eventsRegistered.includes('job:success'));
      assert.ok(eventsRegistered.includes('job:error'));
      assert.ok(eventsRegistered.includes('job:complete'));

      const successHandler = service.listeners.find(
        ({ event }) => event === 'job:success',
      );
      assert.strictEqual(successHandler?.callback(), 'job:success');

      const errorHandler = service.listeners.find(
        ({ event }) => event === 'job:error',
      );
      assert.strictEqual(errorHandler?.callback(), 'job:error');
    });

    it('should preserve instance context and access instance fields in event listeners', () => {
      service.onModuleInit();

      const completeHandler = service.listeners.find(
        ({ event }) => event === 'job:complete',
      );
      assert.ok(completeHandler, 'job:complete handler should be found');

      const result = completeHandler.callback();

      // Verify that the listener had access to its instance fields
      assert.strictEqual(result.event, 'job:complete');
      assert.strictEqual(result.instanceProperty, 'listener-instance-value');
      assert.strictEqual(result.publicField, 'listener-public-field');
      assert.strictEqual(result.hasThisContext, true);
    });
  });
});
