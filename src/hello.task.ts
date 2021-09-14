import { Helpers } from 'graphile-worker';

export function helloTask(payload: any, helpers: Helpers) {
  console.log(`hello task %o`, payload);
}
