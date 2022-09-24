# Changelog

## v0.2.0

- **chore**: update packages & support Nest.js V9 [#8](https://github.com/madeindjs/nestjs-graphile-worker/pull/8)

## v0.1.0

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
