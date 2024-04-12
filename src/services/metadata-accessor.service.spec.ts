import { Injectable } from "@nestjs/common";
import { DiscoveryModule, Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import * as assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GraphileWorkerListener, OnWorkerEvent } from "../decorators/worker.decorators";
import { MetadataAccessorService } from "./metadata-accessor.service";

@Injectable()
@GraphileWorkerListener()
class TestListenerService {
  @OnWorkerEvent("job:success")
  onJobSuccess() {}

  @OnWorkerEvent("job:error")
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
      providers: [MetadataAccessorService, Reflector, TestListenerService, TestNotListenerService],
    }).compile();

    service = module.get(MetadataAccessorService);
    testListener = module.get(TestListenerService);
    testNotListener = module.get(TestNotListenerService);
  });

  it("should be defined", () => {
    assert.ok(service);
  });

  describe("isListener", () => {
    it.skip("should get valid", () => {
      assert.ok(service.isListener(testListener.onJobSuccess));
      assert.ok(service.isListener(testListener.onJobError));
    });

    it("should get invalid", () => {
      assert.equal(service.isListener(testListener.notListener), false);
      assert.equal(service.isListener(testNotListener.onJobSuccess), false);
      assert.equal(service.isListener(testNotListener.onJobError), false);
    });
  });

  describe("isWorkerEvent", () => {
    it("should get valid", () => {
      assert.ok(service.isWorkerEvent(testListener.onJobSuccess));
      assert.ok(service.isWorkerEvent(testListener.onJobError));
    });

    it("should get invalid", () => {
      assert.strictEqual(service.isWorkerEvent(testListener.notListener), false);
      assert.strictEqual(service.isWorkerEvent(testNotListener.onJobSuccess), false);
      assert.strictEqual(service.isWorkerEvent(testNotListener.onJobError), false);
    });
  });

  describe("getListenerMetadata", () => {
    it("should get valid", () => {
      assert.strictEqual(service.getListenerMetadata(testListener.onJobSuccess), "job:success");
      assert.strictEqual(service.getListenerMetadata(testListener.onJobError), "job:error");
    });

    it("should get invalid", () => {
      assert.strictEqual(service.getListenerMetadata(testListener.notListener), undefined);
      assert.strictEqual(service.getListenerMetadata(testNotListener.onJobSuccess), undefined);
      assert.strictEqual(service.getListenerMetadata(testNotListener.onJobError), undefined);
    });
  });
});
