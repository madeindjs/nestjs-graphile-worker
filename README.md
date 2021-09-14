# [Graphile Worker](https://github.com/graphile/worker) for [Nest](https://github.com/nestjs/nest)

This is wrapper for Nest.js and [Graphile Worker](https://github.com/graphile/worker).

What is Graphile worker ?

> Job queue for PostgreSQL running on Node.js - allows you to run jobs (e.g. sending emails, performing calculations, generating PDFs, etc) "in the background" so that your HTTP response/application code is not held up. Can be used with any PostgreSQL-backed application. Pairs beautifully with [PostGraphile](https://www.graphile.org/postgraphile/) or [PostgREST](http://postgrest.org/).

Why you should prefer Graphile Worker instead of [Bull](https://github.com/nestjs/bull) ?

1. You already have a PostgreSQL in your stack (and you don't want to add a Redis server)

## Installation

```bash
$ npm install nest-graphile-worker
```

Then import module

```ts
// src/app.module.ts
import { GraphileWorkerModule } from 'nest-graphile-worker';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString: 'postgres://example:password@postgres/example',
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

Now you can add jobs using `GraphileWorkerService`

```ts
import { GraphileWorkerService } from 'graphile-worker';
import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly graphileWorker: GraphileWorkerService) {}

  @Post()
  @HttpCode(201)
  async addJob() {
    await this.graphileWorker.quickAddJob('test', { hello: 'world' });
  }
}
```

Also you can run worker in bacground in `main.ts` file:

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
