# flo-public-gateway

This is a magnificent public gateway. The new king 👑 of requests.

## Pre-requisites
* Docker
* Docker Compose
* GNU Make

## Quickstart
```
$> make up
$> curl http://localhost:3000
```
## How to run the server?

### Development Mode
```
$> make install
```
This will:
1. Create a dev container that contains nodejs, npm and other tools (feel free to update Dockerfile.build with newer node version, tools etc)
2. Run npm process in a container and download dependencies into node_modules in your local directory (same way as your local npm would)

```
$> make serve
```
This will:
1. Create a container with npm process and pass `serve` to it as a parameter


```
$> make watch
```
This will:
1. Create a Docker container.
2. Launch a local server inside the container with the corresponding ports mapped to the host (including the debugging port: 9229).
3. Watch the filesystem for changes in the source code. Upon a change, the server will automatically reload.

### Production
```
$> make serve NODE_ENV=production
```
This will:
1. Create a Docker container.
2. Download all dependencies inside the container.
3. Launch a server inside the container with the corresponding port mapped to the host.

## How to run tests?

Tests are run using `Jest` and its configuration can be found in `jest.config.js`.

### Single run
```
$> make test
```
This will start a new container with npm as an entry point, based on Dockerfile.build

### Watch mode
```
$> make watch-test
```

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

### Base URLs
DEV: https://api-gw-dev.flocloud.co

PROD: https://api-gw.meetflo.com

