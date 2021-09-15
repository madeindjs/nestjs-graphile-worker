import { FactoryProvider, ValueProvider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { RunnerOptions } from 'graphile-worker';
import { GraphileWorkerModule } from './graphile-worker.module';
import { RUNNER_OPTIONS_KEY } from './interfaces/module-config.interfaces';
import { ListenerExplorerService } from './services/listener-explorer.service';
import { MetadataAccessorService } from './services/metadata-accessor.service';
import { TaskExplorerService } from './services/task-explorer.service';
import { WorkerService } from './services/worker.service';

describe(GraphileWorkerModule.name, () => {
  const connectionString = 'postgres://example:password@postgres/example';
  const internalsProviders = [
    MetadataAccessorService,
    ListenerExplorerService,
    TaskExplorerService,
    WorkerService,
  ];

  const internalsModules = [DiscoveryModule];

  describe('forRoot', () => {
    it('should build dynamic module', () => {
      const dynamicModule = GraphileWorkerModule.forRoot({ connectionString });

      expect(dynamicModule.global).toBeTruthy;
      expect(dynamicModule.imports).toEqual(internalsModules);
      expect(dynamicModule.module).toEqual(GraphileWorkerModule);
      expect(dynamicModule.exports).toEqual([WorkerService]);

      for (const provider of internalsProviders) {
        expect(dynamicModule.providers).toContain(provider);
      }

      const runnerOptionProvider = dynamicModule.providers.find(
        (p: any) => p.provide === RUNNER_OPTIONS_KEY,
      ) as ValueProvider<RunnerOptions>;

      expect(runnerOptionProvider).toBeDefined;
      const runnerOptions = runnerOptionProvider.useValue;

      expect(runnerOptions.connectionString).toEqual(connectionString);
      expect(runnerOptions.events).toBeDefined;
      expect(runnerOptions.logger).toBeDefined;
    });
  });

  describe('forRootAsync', () => {
    it('should build dynamic module', async () => {
      const factory = () => ({ connectionString });

      const dynamicModule = GraphileWorkerModule.forRootAsync({
        useFactory: factory,
      });

      expect(dynamicModule.global).toBeTruthy;
      expect(dynamicModule.imports).toEqual(internalsModules);
      expect(dynamicModule.module).toEqual(GraphileWorkerModule);
      expect(dynamicModule.exports).toEqual([WorkerService]);

      for (const provider of internalsProviders) {
        expect(dynamicModule.providers).toContain(provider);
      }

      const runnerOptionProvider = dynamicModule.providers.find(
        (p: any) => p.provide === RUNNER_OPTIONS_KEY,
      ) as FactoryProvider;

      expect(runnerOptionProvider).toBeDefined;

      const runnerOptions: RunnerOptions =
        await runnerOptionProvider.useFactory();

      expect(runnerOptions.connectionString).toEqual(connectionString);
      expect(runnerOptions.events).toBeDefined;
      expect(runnerOptions.logger).toBeDefined;
    });
  });
});
