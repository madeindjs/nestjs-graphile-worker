import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Task, TaskHandler } from '../../src/index';

@Injectable()
@Task('hello')
export class HelloTask {
  private logger = new Logger(HelloTask.name);

  @TaskHandler()
  handler(payload: any, _helpers: JobHelpers) {
    this.logger.log(`handle ${JSON.stringify(payload)}`);
  }
}
