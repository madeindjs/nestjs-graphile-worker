import { Module } from '@nestjs/common';
import { GraphileWorkerModule } from '../../src/index';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomMiddleware } from './custom.middleware';
import { HelloTask } from './hello.task';
import { MiddlewareExampleTask } from './middleware-example.task';

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString:
        process.env.PG_CONNECTION ||
        'postgres://user:password@localhost:5432/dbname',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, HelloTask, MiddlewareExampleTask, CustomMiddleware],
})
export class AppModule {}
