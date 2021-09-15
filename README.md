# Graphile Worker for Nest.js

[![npm version](https://badge.fury.io/js/nestjs-graphile-worker.svg)](https://badge.fury.io/js/nestjs-graphile-worker)

This is wrapper for [Nest.js](https://github.com/nestjs/nest) and [Graphile Worker](https://github.com/graphile/worker).

What is Graphile worker ?

> Job queue for PostgreSQL running on Node.js - allows you to run jobs (e.g. sending emails, performing calculations, generating PDFs, etc) "in the background" so that your HTTP response/application code is not held up. Can be used with any PostgreSQL-backed application. Pairs beautifully with [PostGraphile](https://www.graphile.org/postgraphile/) or [PostgREST](http://postgrest.org/).

Why you should prefer Graphile Worker instead of [Bull](https://github.com/nestjs/bull) ?

1. You already have a PostgreSQL in your stack (and you don't want to add a Redis server)

## Features

- use a `GraphileWorkerModule.forRoot` to register Graphile Worker (support `asRootAsync` as well)
- provide a `WorkerService` to add jobs or start runner
- provide a `@OnWorkerEvent` decorator to add custom behavior on `job:success` for example
- provide a `@Task(name)` decorator to define your injectable tasks

## Installation

```bash
$ npm install nest-graphile-worker
```

## Usage

### Import module

You can use `GraphileWorkerModule.forRoot`:

```ts
// src/app.module.ts
import { GraphileWorkerModule } from 'nest-graphile-worker';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString: 'postgres://example:password@postgres/example',
      taskList: {
        hello: helloTask,
      },
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

Or you can use `GraphileWorkerModule.forRootAsync`:

```ts
import { GraphileWorkerModule } from '@app/graphile-worker';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { helloTask } from './hello.task';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphileWorkerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connectionString: config.get('PG_CONNECTION'),
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

## Create task

To create task you need to define an `@Injectable` class with `@Task(name)` decorator who contains a decorated method `@TaskHandler`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Helpers } from 'graphile-worker';
import { Task, TaskHandler } from '../../src/index';

@Injectable()
@Task('hello')
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
import { Module } from '@nestjs/common';
import { HelloTask } from './hello.task';
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

## Create jobs

You may use `WorkerService`:

```ts
import { WorkerService } from '@app/graphile-worker';
import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly graphileWorker: WorkerService) {}

  @Post()
  @HttpCode(201)
  async addJob() {
    await this.graphileWorker.addJob('hello', { hello: 'world' });
  }

  @Post('bulk')
  @HttpCode(201)
  async addJobs() {
    const jobs = new Array(100)
      .fill(undefined)
      .map((_, i) => ({ identifier: 'hello', payload: { hello: i } }));

    return this.graphileWorker.addJobs(jobs);
  }
}
```

## Start runner

Add `WorkerService.run` in `main.ts` file:

```ts
import { WorkerService } from '@app/graphile-worker';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.get(WorkerService).run();
  await app.listen(3000);
}
bootstrap();
```

## `OnWorkerEvent` decorator

This decorator allow you to listen all [GRaphile Worker event](https://github.com/graphile/worker#workerevents)

You need to add `@GraphileWorkerListener` decorator on your class and then set `@OnWorkerEvent(eventName)` on method:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { WorkerEventMap } from 'graphile-worker';
import { GraphileWorkerListener, OnWorkerEvent } from '../../src/index';

@Injectable()
@GraphileWorkerListener()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  @OnWorkerEvent('job:success')
  onJobSuccess({ job }: WorkerEventMap['job:success']) {
    this.logger.debug(`job #${job.id} finished`);
  }

  @OnWorkerEvent('job:error')
  onJobError({ job, error }: WorkerEventMap['job:error']) {
    this.logger.error(`job #${job.id} fail ${JSON.stringify(error)}`);
  }
}
```

## Test

```bash
# unit tests
$ npm run test

# test coverage
$ npm run test:cov
```

# Sample

You can find a [sample](./sample/) who use library. To run it, simply `npm install` and then:

```sh
docker-compose up
```
