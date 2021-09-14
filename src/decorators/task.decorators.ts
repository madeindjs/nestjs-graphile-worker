import { SetMetadata } from '@nestjs/common';

export const TASK_METADATA = Symbol.for('TASK_METADATA');

export const TASK_HANDLER_METADATA = Symbol.for('TASK_HANDLER_METADATA');

export function Task(name: string): ClassDecorator {
  return SetMetadata(TASK_METADATA, name);
}

export function TaskHandler(): MethodDecorator {
  return SetMetadata(TASK_HANDLER_METADATA, true);
}
