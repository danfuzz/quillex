Development Guide
=================

### Directory structure

* `client` &mdash; Client code and static assets. The main client-side
  application entrypoint is `js/app.js`.
* `compiler` &mdash; Submodule used to build the server-side code, using Babel
  in an appropriately-configured manner.
* `doc` &mdash; Project documentation.
* `etc` &mdash; A dumping ground for miscellaneous files.
* `local-modules` &mdash; JavaScript module code (Node modules, essentially)
  which can be used on both the client and server sides.
* `scripts` &mdash; Scripts for use during development (see above).
* `server` &mdash; Server code. The main entrypoint is `main.js`.
* `out` &mdash; Where the results of doing a build end up.

### Build and Run

Bayou uses [Node](https://nodejs.org) on the server side, and it uses
[npm](https://npmjs,com) for module management. Install both of these if you
haven't already done so. As of this writing, the bulk of development and
testing have been done using `node` versions 6 and 7, and `npm` versions 3 and
4.

To build and run, say:

```
$ cd bayou
$ ./scripts/develop
```

and then visit <http://localhost:8080>. This will do a build first. If you
_just_ want to do the build, then you can say:

```
$ ./scripts/build
```

In production, run using the `run` script placed in the product's `bin`
directory:

```
$ ./out/bin/run
```

### Hermetic build

The Bayou build supports using prepackaged dependencies, if desired. These
can be used (a) to guard against unexpected changes in upstream packages, and
(b) to perform builds without hitting the network (an ability valued by some
organizations).

To build the boxed dependencies, say:

```
$ ./scripts/build-boxes --out=<box-dir>
```

(Replace `<box-dir>` with the name of a directory to store the boxes in.)

To perform a build with boxes, say:

```
$ ./scripts/build --boxes=<box-dir>
```

### Cleanup

```
$ ./scripts/clean
```

### Editor setup

You may want to install live linting into your editor. If you use the Atom
editor, the package `linter-eslint` can do that.

- - - - - - - - - -

```
Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
Licensed AS IS and WITHOUT WARRANTY under the Apache License,
Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>
```