// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { inject } from '@bayou/injecty';

import Ids from './Ids';

/**
 * Injects all of the definitions here into the global configuration.
 */
function injectAll() {
  inject.Ids = Ids;
}

export {
  Ids,
  injectAll
};
