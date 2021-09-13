import { GraphileWorkerService } from '@app/graphile-worker';
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
