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
import type { Helpers } from "graphile-worker";
import { Task, TaskHandler } from "../../src/index";

@Injectable()
@Task("hello")
export class HelloTask {
  private logger = new Logger(HelloTask.name);

  @TaskHandler()
  handler(payload: any, _helpers: Helpers) {
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

## Sample

You can find a [sample](./sample/) using this library. To run it, simply `npm install` and then:

```sh
docker-compose up
```
