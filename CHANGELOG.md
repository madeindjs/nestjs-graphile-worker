# Changelog

## Current

- **feat(task)**: provide a `@Task(name)` decorator to define your injectable tasks
- **feat(logger)**: provide a Nest.js logger for GraphileWorker runner
- **fix(hooks)**: Set all worker hooks (was only `job:success`)
- **refactor(configuration)**: Remove `ConfigurationService` class and use a plain object `RunnerOptions`
- **refactor()**: Rename `GraphileWorkerService` to `WorkerService`
- **doc(license)**: add license MIT

## v0.0.3-alpha

- reduce dependencies

## v0.0.2-alpha

- initial version
