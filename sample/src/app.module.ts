import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphileWorkerModule } from '../../src/index';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloTask } from './hello.task';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphileWorkerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connectionString: config.get('PG_CONNECTION'),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService, HelloTask],
})
export class AppModule {}
