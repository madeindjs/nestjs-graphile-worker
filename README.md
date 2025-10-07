# Graphile Worker for Nest.js

[![npm version](https://badge.fury.io/js/nestjs-graphile-worker.svg)](https://badge.fury.io/js/nestjs-graphile-worker)
![Test status](https://github.com/madeindjs/nestjs-graphile-worker/actions/workflows/main.yml/badge.svg)

A [Nest.js](https://github.com/nestjs/nest) wrapper for [Graphile Worker](https://github.com/graphile/worker).

What is Graphile worker ?

> Job queue for PostgreSQL running on Node.js - allows you to run jobs (e.g. sending emails, performing calculations, generating PDFs, etc) "in the background" so that your HTTP response/application code is not held up. Can be used with any PostgreSQL-backed application. Pairs beautifully with [PostGraphile](https://www.graphile.org/postgraphile/) or [PostgREST](http://postgrest.org/).

Why you should prefer Graphile Worker instead of [Bull](https://github.com/nestjs/bull) ?

1. You already have a PostgreSQL in your stack (and you don't want to add a Redis server)

## Features

- provide a module `GraphileWorkerModule` to setup the runner using `asRoot` or `asRootAsync`
- provide a `WorkerService` to add jobs or start runner
- provide a `@OnWorkerEvent` decorator to add custom behavior on `job:success` for example
- provide a `@Task(name)` decorator to define your injectable tasks
- provide middleware support to control job execution for cross-cutting concerns (e.g. context enrichment)

## Installation

```sh
npm install nestjs-graphile-worker
yarn add nestjs-graphile-worker
pnpm add nestjs-graphile-worker
```

## Usage

### 1. Setup the module

In order, to setup the library, you need to import and initialize [`GraphileWorkerModule`](./src/graphile-worker.module.ts).

You can do it using `forRoot` method:

```ts
// src/app.module.ts
import { GraphileWorkerModule } from "nest-graphile-worker";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString: "postgres://example:password@postgres/example",
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

Or using `forRootAsync`:

```ts
// src/app.module.ts
import { GraphileWorkerModule } from "nestjs-graphile-worker";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { helloTask } from "./hello.task";

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphileWorkerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connectionString: config.get("PG_CONNECTION"),
        taskList: {
          hello: helloTask,
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

The module configuration is [`GraphileWorkerConfiguration`](./src/interfaces/module-config.interfaces.ts), which is a wrapper around Graphile's [`RunnerOptions`](https://github.com/graphile/worker/blob/7feecdde5692569f006d3379f4caee01c4482707/src/interfaces.ts#L716)

```ts
type GraphileWorkerConfiguration = Omit<RunnerOptions, "events" | "taskList">;
```

This means you can pass any configuration to the runner, like [Recurring tasks (crontab)](https://worker.graphile.org/docs/cron):

```ts
// src/app.module.ts
@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString: "postgres://example:password@postgres/example",
      crontab: [' * * * * * taskIdentifier ?priority=1 {"foo": "bar"}'].join(
        "\n",
      ),
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

### 2. Create task

To create task you need to define an `@Injectable` class with `@Task(name)` decorator containing a decorated method with `@TaskHandler`:

```ts
// src/hello.task.ts
import { Injectable, Logger } from "@nestjs/common";
import type { JobHelpers } from "graphile-worker";
import { Task, TaskHandler } from "../../src/index";

@Injectable()
@Task("hello")
export class HelloTask {
  private logger = new Logger(HelloTask.name);

  @TaskHandler()
  handler(payload: any, _helpers: JobHelpers) {
    this.logger.log(`handle ${JSON.stringify(payload)}`);
  }
}
```

Then do not forget to register this class as provider in your module:

```ts
// src/app.module.ts
import { Module } from "@nestjs/common";
import { HelloTask } from "./hello.task";
// ...

@Module({
  imports: [
    /* ... */
  ],
  controllers: [
    /* ... */
  ],
  providers: [HelloTask],
})
export class AppModule {}
```

### 3. Create jobs

You can use [`WorkerService`](./src/services/worker.service.ts) which is a wrapper of [`graphile-worker`](graphile-worker)'s [`Runner`](https://worker.graphile.org/docs/library/run#runner) instance. [`WorkerService`](./src/services/worker.service.ts) let you add job easily.

```ts
import { WorkerService } from "nestjs-graphile-worker";
import { Controller, HttpCode, Post } from "@nestjs/common";

@Controller()
export class AppController {
  constructor(private readonly graphileWorker: WorkerService) {}

  @Post()
  @HttpCode(201)
  async addJob() {
    await this.graphileWorker.addJob("hello", { hello: "world" });
  }

  @Post("bulk")
  @HttpCode(201)
  async addJobs() {
    const jobs = new Array(100)
      .fill(undefined)
      .map((_, i) => ({ identifier: "hello", payload: { hello: i } }));

    return this.graphileWorker.addJobs(jobs);
  }
}
```

### 4. Start runner

Add [`WorkerService.run`](https://github.com/madeindjs/nestjs-graphile-worker/blob/7ed5a99dcd28a11259031e0e738b0cf5a4050904/src/services/worker.service.ts#L31-L42) in `main.ts` file:

```ts
import { WorkerService } from "nestjs-graphile-worker";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.get(WorkerService).run();
  await app.listen(3000);
}
bootstrap();
```

### 5. Listen any Graphile's event

You can use `@OnWorkerEvent` decorator to listen any [Graphile Worker event](https://worker.graphile.org/docs/worker-events). You simply have to:

1. `@GraphileWorkerListener` decorator on your class
2. set `@OnWorkerEvent(eventName)` on your method

```ts
import { Injectable, Logger } from "@nestjs/common";
import { WorkerEventMap } from "graphile-worker";
import { GraphileWorkerListener, OnWorkerEvent } from "../../src/index";

@Injectable()
@GraphileWorkerListener()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  @OnWorkerEvent("job:success")
  onJobSuccess({ job }: WorkerEventMap["job:success"]) {
    this.logger.debug(`job #${job.id} finished`);
  }

  @OnWorkerEvent("job:error")
  onJobError({ job, error }: WorkerEventMap["job:error"]) {
    this.logger.error(`job #${job.id} fail ${JSON.stringify(error)}`);
  }
}
```

### Job middlewares

Middlewares can help implement cross-cutting concerns like:

- **Context enrichment** - Add fresh runtime data to the job payload, or use the job data to enrich some higher-level
context context (e.g. include the jobId in a logger context)
- **Error handling** - Add error handling applying to all jobs, e.g. to handle the last attempt failed gracefully as
recommended in the [Graphile Worker documentation](https://worker.graphile.org/docs/scaling#keep-your-jobs-table-small)
- **Conditional execution** - Skip or modify job execution based on runtime conditions
- **Rate limiting and throttling** - Prevent job execution under certain conditions

The advantage of middlewares is that they execute **as part of the job execution flow**, giving you full control over
the job's context and execution.  
In contrast, WorkerEvent listeners execute **as separate event handlers**, making them more suitable for side effects (like notifications or monitoring) but not for controlling or modifying job execution itself.

#### Usage

To create a middleware, you should define a classe with the decorator `@Middleware('myUniqueMiddlewareId')`.
For your middleware to automatically apply to all jobs, you can define it as a global middleware by using the
`global: true` option (`@Middleware('myMiddlewareId', { global: true })`).

For those middlewares that are not defined as global, you have to annotate the specific task handlers the middlewares
should apply to, by using the decorator `@UseMiddlewares(['myLocalMiddleware'])`.

You can also bypass specific global middlewares for individual handlers using the `bypassGlobalMiddlewares` option:
`@UseMiddlewares(['myLocalMiddleware'], { bypassGlobalMiddlewares: ['myGlobalMiddleware'] })`. This provides maximum
flexibility for controlling middleware execution on a per-handler basis if needed.

Here is an example:

```ts
import { Injectable } from "@nestjs/common";
import { Middleware, MiddlewareProvider } from "nestjs-graphile-worker";
import { JobHelpers } from "graphile-worker";

@Injectable()
@Middleware('myGlobalMiddleware', { global: true })
export class ContextMiddleware implements MiddlewareProvider {
  async use(payload: any, helpers: JobHelpers, next: Function) {
    // Add job execution context that handlers can use
    const enrichedPayload = {
      ...payload,
      _jobContext: {
        jobId: helpers.job.id,
      }
    };
    
    setLoggerContext({jobId: helpers.job.id}); // some logging util to set logging context

    await next(enrichedPayload);
  }
}

@Injectable()
@Middleware('myLocalMiddleware')
export class GracefulLastAttemptFailureMiddleware implements MiddlewareProvider {
  async use(payload: any, helpers: JobHelpers, next: Function) {
    try {
      return await next(payload);
    } catch (error) {
      const { job, logger } = helpers;

      if (job.attempts < job.max_attempts) {
        throw error; // Re-throw if not the last attempt
      }
      // Handle the last attempt error gracefully, and avoid a permafailed job being stored in the jobs table
      logger.error(`Permanently failed to handle task ${job.task_identifier}`, { payload });
      instrumentation.onJobFailedWithGracefulExit(job.task_identifier); // some instrumentation util for monitoring
    }
  }
}

@Injectable()
@Task('myTask')
export class MyTask  {

  @UseMiddlewares(['myLocalMiddleware'])
  @TaskHandler()
  async handler(payload: any, helpers: JobHelpers) {
    // do something
  }

  // Bypass specific global middlewares for this handler
  @UseMiddlewares(
    ['myLocalMiddleware'], 
    { bypassGlobalMiddlewares: ['myGlobalMiddleware'] }
  )
  @TaskHandler()
  async handlerWithBypass(payload: any, helpers: JobHelpers) {
    // This handler will skip 'myGlobalMiddleware' but still use 'myLocalMiddleware'
  }

  // Trick: bypass a global middleware but use it in the array of handler-specific middlewares to control execution order
  @UseMiddlewares(
    ['myLocalMiddleware', 'myGlobalMiddleware'], 
    { bypassGlobalMiddlewares: ['myGlobalMiddleware'] }
  )
  @TaskHandler()
  async handlerWithBypass(payload: any, helpers: JobHelpers) {
    // Bypasses `myGlobalMiddleware` but includes it locally to control execution order: while global middlewares
    // execute before local handlers, here `myGlobalMiddleware` gets executed as a local handler after `myLocalMiddleware`
  }
}

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString: "postgres://example:password@postgres/example",
    }),
  ],
  providers: [
    ContextMiddleware,
    GracefulLastAttemptFailureMiddleware,
    // ... other providers
  ],
  // ... other module config
})
export class AppModule {}
```

#### Middleware execution order

Global middlewares are always executed first, then handler-specific middlewares.

**Important**: Global middleware execution order is determined by the order in which they are declared in the `providers` 
array. Middlewares execute in the same order they appear in the array.

```ts
@Module({
  providers: [
    FirstGlobalMiddleware,    // Executes first
    SecondGlobalMiddleware,   // Executes second  
    // ... other providers
  ],
})
export class AppModule {}
```

#### Middleware troubleshooting: common issues

> Take care of handling errors appropriately in your middleware.  
> Also keep your middleware lightweight and avoid heavy computations.

1. **Middleware not executing**: Ensure the middleware class is decorated with `@Middleware()` and registered as a
provider in your module.

2. **Tasks hanging**: Make sure every middleware calls `next()` or throws an error.

3. **Payload not modified**: Ensure you're passing the modified payload to `next(modifiedPayload)`.

4. **Performance issues**: Check for heavy operations in middleware that might slow down task execution.

## Sample

You can find a [sample](./sample/) using this library. To run it, simply `npm install` and then:

```sh
docker-compose up
```
