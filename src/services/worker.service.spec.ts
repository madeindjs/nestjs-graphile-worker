import { Test, TestingModule } from "@nestjs/testing";
import { RunnerOptions } from "graphile-worker";
import * as assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { RUNNER_OPTIONS_KEY } from "../interfaces/module-config.interfaces";
import { ListenerExplorerService } from "./listener-explorer.service";
import { TaskExplorerService } from "./task-explorer.service";
import { WorkerService } from "./worker.service";

describe(WorkerService.name, () => {
  let service: WorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: ListenerExplorerService,
          useValue: {
            listeners: [],
            ensureInitialized: () => {},
          },
        },
        {
          provide: TaskExplorerService,
          useValue: {
            taskList: {},
          },
        },
        {
          provide: RUNNER_OPTIONS_KEY,
          useValue: {
            taskList: { hello: () => {} },
            connectionString: "postgres://example:password@postgres/example",
          } as RunnerOptions,
        },
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
  });

  it("should be defined", () => {
    assert.ok(service);
  });
});
