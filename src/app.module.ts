import { GraphileWorkerModule } from '@app/graphile-worker';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { helloTask } from './hello.task';

@Module({
  imports: [
    // GraphileWorkerModule.forRoot({
    //   connectionString: 'postgres://example:password@postgres/example',
    //   taskList: {
    //     hello: helloTask,
    //   },
    // }),
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
