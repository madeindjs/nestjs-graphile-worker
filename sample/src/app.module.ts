import { Module } from '@nestjs/common';
import { GraphileWorkerModule } from '../../src/index';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BypassGlobalMiddlewareTask } from './bypass-global-middleware.task';
import { HelloTask } from './hello.task';
import { MiddlewareExampleTask } from './middleware-example.task';
import {
  Global1Middleware,
  Global2Middleware,
  Local1Middleware,
  Local2Middleware,
} from './middlewares';

@Module({
  imports: [
    GraphileWorkerModule.forRoot({
      connectionString:
        process.env.PG_CONNECTION ||
        'postgres://user:password@localhost:5432/dbname',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HelloTask,
    MiddlewareExampleTask,
    BypassGlobalMiddlewareTask,
    Global1Middleware,
    Global2Middleware,
    Local1Middleware,
    Local2Middleware,
  ],
})
export class AppModule {}
