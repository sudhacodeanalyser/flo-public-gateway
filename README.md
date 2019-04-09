# FLO Node.js Service Template

This is a template project intended to serve as base for new applications.

## Pre-requisites
* Docker
* Docker Compose

## How to run the server?

### Development Mode

```$> make dev-watch```

This will:
1. Create a Docker container.
2. Download all dependencies inside the container.
3. Launch a local server inside the container with the corresponding ports mapped to the host (including the debugging port: 9229).
4. Watch the filesystem for changes in the source code. Upon a change, the server will automatically reload.

### Production

```$> make prod```

This will:
1. Create a Docker container.
2. Download all dependencies inside the container.
3. Launch a server inside the container with the corresponding port mapped to the host.

## How to run tests?

Tests are run using `Jest` and its configuration can be found in `jest.config.js`.

### Single run

  ```$> make test```

### Watch mode

  ```$> make watch-tests```

Both commands will run inside a Docker container (if there is a container already running, it will just run the tests inside in order to avoid launching a new one).

## What else is inside this template?

### TSLint
TSLint is an extensible static analysis tool that checks TypeScript code for readability, maintainability, and functionality errors.

Its rules are configured in `tslint.json`.

### Prettier
Prettier is a code formatter that supports TypeScript and integrates with many IDEs.

Its rules are configured in `prettier.config.js`

### Makefile
As the avid reader might have noticed, we are using `Makefile`. Run `make help` (or just `make`) to get a list of all the available targets.