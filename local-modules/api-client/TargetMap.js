// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import TargetHandler from './TargetHandler';

/**
 * Map of the various targets being provided by a connection.
 */
export default class TargetMap {
  /**
   * Constructs an instance.
   *
   * @param {ApiClient} apiClient The client to forward calls to.
   */
  constructor(apiClient) {
    /**
     * The targets being provided, as a map from name to proxy. **Note:** In a
     * future incarnation, this map may contain more items and might even grow
     * dynamically.
     */
    this._targets = new Map();
    this._targets.set('main', TargetHandler.makeProxy(apiClient, 'main'));
    this._targets.set('meta', TargetHandler.makeProxy(apiClient, 'meta'));
  }

  /**
   * Gets the proxy for the target with the given name.
   *
   * @param {string} name The target name.
   * @returns {object} The corresponding proxy.
   */
  get(name) {
    const result = this._targets.get(name);

    if (!result) {
      throw new Error(`No such target: ${name}`);
    }

    return result;
  }
}