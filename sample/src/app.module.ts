import { Module } from '@nestjs/common';
import { GraphileWorkerModule } from '../../src/index';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloTask } from './hello.task';
import { MiddlewareExampleTask } from './middleware-example.task';
import { customMiddleware } from './custom.middleware';

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString:
        process.env.PG_CONNECTION ||
        'postgres://user:password@localhost:5432/dbname',
      middlewares: [customMiddleware],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, HelloTask, MiddlewareExampleTask],
})
export class AppModule {}
