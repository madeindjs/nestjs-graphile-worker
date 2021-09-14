# [Graphile Worker](https://github.com/graphile/worker) for [Nest](https://github.com/nestjs/nest)

[![npm version](https://badge.fury.io/js/nestjs-graphile-worker.svg)](https://badge.fury.io/js/nestjs-graphile-worker)

This is wrapper for Nest.js and [Graphile Worker](https://github.com/graphile/worker).

What is Graphile worker ?

> Job queue for PostgreSQL running on Node.js - allows you to run jobs (e.g. sending emails, performing calculations, generating PDFs, etc) "in the background" so that your HTTP response/application code is not held up. Can be used with any PostgreSQL-backed application. Pairs beautifully with [PostGraphile](https://www.graphile.org/postgraphile/) or [PostgREST](http://postgrest.org/).

Why you should prefer Graphile Worker instead of [Bull](https://github.com/nestjs/bull) ?

1. You already have a PostgreSQL in your stack (and you don't want to add a Redis server)

## Features

- use a `GraphileWorkerModule` to register Graphile Worker with a `asRootAsync` to pass dynamic parameters
- provide a `GraphileWorkerService` to add jobs or start runner
- provide a `OnWorkerEvenet` decorator to add custom behavior on `job:success` for example

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

## Create jobs

You may use `GraphileWorkerService`:

```ts
import { GraphileWorkerService } from '@app/graphile-worker';
import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly graphileWorker: GraphileWorkerService) {}

  @Post()
  @HttpCode(201)
  async addJob() {
    await this.graphileWorker.addJob('hello', { hello: 'world' });
  }

  @Post('bulk')
  @HttpCode(201)
  async addJobs() {
    const jobs: Array<{ identifier: string; payload?: unknown }> = new Array(
      100,
    )
      .fill(undefined)
      .map((_, i) => ({ identifier: 'hello', payload: { hello: i } }));

    return this.graphileWorker.addJobs(jobs);
  }
}
```

## Start runner

Add `GraphileWorkerService.run` in `main.ts` file:

```ts
import { GraphileWorkerService } from '@app/graphile-worker';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.get(GraphileWorkerService).run();
  await app.listen(3000);
}
bootstrap();
```

## `OnWorkerEvent` decorator

You need to add `@GraphileWorkerListener` decorator on your class and then set `@OnWorkerEvent(eventName)` on method:

```ts
import { GraphileWorkerListener, OnWorkerEvent } from '@app/graphile-worker';
import { Injectable, Logger } from '@nestjs/common';
import { WorkerEventMap } from 'graphile-worker';

@Injectable()
@GraphileWorkerListener()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  @OnWorkerEvent('job:success')
  onJobSuccess({ job }: WorkerEventMap['job:success']) {
    this.logger.debug(`job #${job.id} finished`);
    // output: [Nest] 1732  - 09/14/2021, 12:42:45 PM   DEBUG [AppService] job #349 finished
  }
}
```

You can find a complete list of available event on [Graphile Worker's documentation](https://github.com/graphile/worker#workerevents).

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
