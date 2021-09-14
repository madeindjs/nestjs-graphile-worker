import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { RunnerOptions } from 'graphile-worker';

@Injectable()
export class ConfigurationService {
  constructor(public readonly config: RunnerOptions) {
    const events = new EventEmitter();

    this.config.events = events;
  }
}

export const CONFIGURATION_SERVICE_KEY = Symbol.for(ConfigurationService.name);
