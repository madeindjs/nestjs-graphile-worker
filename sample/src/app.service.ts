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
}
