import { GraphileWorkerModule } from '@app/graphile-worker';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { helloTask } from './hello.task';

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
