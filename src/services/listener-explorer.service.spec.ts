import { Injectable } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import * as assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GraphileWorkerListener, OnWorkerEvent } from "../decorators/worker.decorators";
import { ListenerExplorerService } from "./listener-explorer.service";
import { MetadataAccessorService } from "./metadata-accessor.service";

@Injectable()
@GraphileWorkerListener()
class TestListenerService {
  @OnWorkerEvent("job:success")
  onJobSuccess() {
    return "job:success";
  }

  @OnWorkerEvent("job:error")
  onJobError() {
    return "job:error";
  }
}

describe(ListenerExplorerService.name, () => {
  let service: ListenerExplorerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [ListenerExplorerService, MetadataAccessorService, TestListenerService],
    }).compile();

    service = module.get<ListenerExplorerService>(ListenerExplorerService);
  });

  it("should be defined", () => {
    assert.ok(service);
  });

  describe("onModuleInit", () => {
    it("should register TestListenerService", () => {
      service.onModuleInit();
      assert.strictEqual(service.listeners.length, 2);

      const eventsRegistered = service.listeners.map((l) => l.event);

      assert.ok(eventsRegistered.includes("job:success"));
      assert.ok(eventsRegistered.includes("job:error"));

      const successHandler = service.listeners.find(({ event }) => event === "job:success");
      assert.strictEqual(successHandler?.callback(), "job:success");

      const errorHandler = service.listeners.find(({ event }) => event === "job:error");
      assert.strictEqual(errorHandler?.callback(), "job:error");
    });
  });
});
