import { FactoryProvider, ValueProvider } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { RunnerOptions } from "graphile-worker";
import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GraphileWorkerModule } from "./graphile-worker.module";
import { RUNNER_OPTIONS_KEY } from "./interfaces/module-config.interfaces";
import { ListenerExplorerService } from "./services/listener-explorer.service";
import { MetadataAccessorService } from "./services/metadata-accessor.service";
import { TaskExplorerService } from "./services/task-explorer.service";
import { WorkerService } from "./services/worker.service";

describe(GraphileWorkerModule.name, () => {
  const connectionString = "postgres://example:password@postgres/example";
  const internalsProviders = [MetadataAccessorService, ListenerExplorerService, TaskExplorerService, WorkerService];

  const internalsModules = [DiscoveryModule];

  describe("forRoot", () => {
    it("should build dynamic module", () => {
      const dynamicModule = GraphileWorkerModule.forRoot({ connectionString });

      assert.ok(dynamicModule.global);
      assert.deepEqual(dynamicModule.imports, internalsModules);
      assert.equal(dynamicModule.module, GraphileWorkerModule);
      assert.deepEqual(dynamicModule.exports, [WorkerService]);

      for (const provider of internalsProviders) {
        assert.ok(dynamicModule.providers.includes(provider));
      }

      const runnerOptionProvider = dynamicModule.providers.find(
        (p: any) => p.provide === RUNNER_OPTIONS_KEY
      ) as ValueProvider<RunnerOptions>;

      assert.ok(runnerOptionProvider);
      const runnerOptions = runnerOptionProvider.useValue;

      assert.strictEqual(runnerOptions.connectionString, connectionString);
      assert.ok(runnerOptions.events);
      assert.ok(runnerOptions.logger);
    });
  });

  describe("forRootAsync", () => {
    it("should build dynamic module", async () => {
      const factory = () => ({ connectionString });

      const dynamicModule = GraphileWorkerModule.forRootAsync({
        useFactory: factory,
      });

      assert.ok(dynamicModule.global);
      assert.deepEqual(dynamicModule.imports, internalsModules);
      assert.equal(dynamicModule.module, GraphileWorkerModule);
      assert.deepEqual(dynamicModule.exports, [WorkerService]);

      for (const provider of internalsProviders) {
        assert(dynamicModule.providers.includes(provider));
      }

      const runnerOptionProvider = dynamicModule.providers.find(
        (p: any) => p.provide === RUNNER_OPTIONS_KEY
      ) as FactoryProvider;

      assert.ok(runnerOptionProvider);

      const runnerOptions: RunnerOptions = await runnerOptionProvider.useFactory();

      assert.strictEqual(runnerOptions.connectionString, connectionString);
      assert.ok(runnerOptions.events);
      assert.ok(runnerOptions.logger);
    });
  });
});
