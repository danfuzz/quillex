// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

/*
 * Top-level entry point for client tests.
 */

import { Logger } from 'see-all';
import { ClientSink } from 'see-all-client';
import { Tests } from 'testing-client';

// Init logging.
ClientSink.init();
const log = new Logger('page-init');
log.detail('Starting...');

const elem = document.createElement('p');
elem.innerHTML = 'Running&hellip;';
document.body.appendChild(elem);

Tests.runAll().then((result) => {
  elem.innerHTML = result;
});