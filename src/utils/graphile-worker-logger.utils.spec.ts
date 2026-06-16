import { LogLevel } from "@graphile/logger";
import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NestLikeLogger } from "./graphile-worker-logger.utils";
import { createGraphileWorkerLogFunction } from "./graphile-worker-logger.utils";

function createMockLogger() {
  const calls: { method: string; args: unknown[] }[] = [];
  const logger: NestLikeLogger = {
    debug: (message) => calls.push({ method: "debug", args: [message] }),
    error: (message) => calls.push({ method: "error", args: [message] }),
    warn: (message) => calls.push({ method: "warn", args: [message] }),
    log: (message) => calls.push({ method: "log", args: [message] }),
  };
  return { logger, calls };
}

const LEVEL_TO_METHOD: Record<string, string> = {
  [LogLevel.DEBUG]: "debug",
  [LogLevel.ERROR]: "error",
  [LogLevel.WARNING]: "warn",
  [LogLevel.INFO]: "log",
};

describe("createGraphileWorkerLogFunction", () => {
  describe("without meta (single argument only)", () => {
    const cases = [
      { level: LogLevel.DEBUG, message: "Spawned" },
      { level: LogLevel.ERROR, message: "error msg" },
      { level: LogLevel.WARNING, message: "warning msg" },
      { level: LogLevel.INFO, message: "info msg" },
    ];

    for (const { level, message } of cases) {
      const expectedMethod = LEVEL_TO_METHOD[level];
      it(`${expectedMethod}: invokes logger.${expectedMethod} once with message only`, () => {
        const { logger, calls } = createMockLogger();
        const logFn = createGraphileWorkerLogFunction(logger);

        logFn(level, message, undefined);

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].method, expectedMethod);
        assert.deepEqual(calls[0].args, [message]);
      });
    }
  });

  describe("with meta (appended to message string, not as second argument)", () => {
    const cases = [
      { level: LogLevel.DEBUG, message: "msg", meta: { foo: "bar" } },
      { level: LogLevel.ERROR, message: "failed", meta: { code: "E001" } },
      { level: LogLevel.WARNING, message: "deprecated", meta: { since: "v2" } },
      { level: LogLevel.INFO, message: "started", meta: { taskId: 1 } },
    ];

    for (const { level, message, meta } of cases) {
      const expectedMethod = LEVEL_TO_METHOD[level];
      it(`${expectedMethod}: includes meta in message string`, () => {
        const { logger, calls } = createMockLogger();
        const logFn = createGraphileWorkerLogFunction(logger);

        logFn(level, message, meta);

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0].method, expectedMethod);
        assert.strictEqual(calls[0].args.length, 1);
        const logged = String(calls[0].args[0]);
        assert.ok(logged.includes(message));
        assert.ok(logged.includes(JSON.stringify(meta)));
      });
    }
  });
});
