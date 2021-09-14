import { Task, TaskHandler } from '@app/graphile-worker';
import { Injectable, Logger } from '@nestjs/common';
import { Helpers } from 'graphile-worker';

export function helloTask(payload: any, helpers: Helpers) {
  console.log(`hello task %o`, payload);
}

@Injectable()
@Task('hello')
export class HelloTask {
  private logger = new Logger(HelloTask.name);

  @TaskHandler()
  handler(payload: any, _helpers: Helpers) {
    this.logger.log(`handle ${payload}`);
  }
}
