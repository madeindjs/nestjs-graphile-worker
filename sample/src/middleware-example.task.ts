import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Task, TaskHandler, UseMiddlewares } from '../../src/index';

@Injectable()
@Task('middleware-example')
export class MiddlewareExampleTask {
  private logger = new Logger(MiddlewareExampleTask.name);

  @UseMiddlewares(['local1', 'local2'])
  @TaskHandler()
  async handler(payload: any, _helpers: JobHelpers) {
    this.logger.log(
      'Now processing the middleware-example task handler logic, with payload:',
      payload,
    );
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate some work
    this.logger.log('middleware-example  task now completed');
  }
}
