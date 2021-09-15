import { Controller, HttpCode, Post } from '@nestjs/common';
import { WorkerService } from '../../src/index';

@Controller()
export class AppController {
  constructor(private readonly graphileWorker: WorkerService) {}

  @Post()
  @HttpCode(201)
  async addJob() {
    await this.graphileWorker.addJob('hello', { hello: 'world' });
  }

  @Post('bulk')
  @HttpCode(201)
  async addJobs() {
    const jobs: Array<{ identifier: string; payload?: unknown }> = new Array(
      100,
    )
      .fill(undefined)
      .map((_, i) => ({ identifier: 'hello', payload: { hello: i } }));

    return this.graphileWorker.addJobs(jobs);
  }
}
