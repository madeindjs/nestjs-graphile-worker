import { GraphileWorkerModule } from '@app/graphile-worker';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

@Module({
  imports: [
    GraphileWorkerModule.forRoot(
      'postgres://example:password@postgres/example',
    ),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
