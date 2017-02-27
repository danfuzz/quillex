// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import TypeError from './TypeError';

/**
 * Type checker for type `Array`.
 */
export default class TArray {
  /**
   * Checks a value of type `Array`. Optionally checks the type of each element.
   *
   * @param {*} value The (alleged) array.
   * @param {Function} [elementCheck = null] Element type checker. If passed,
   *   must be a function that behaves like a standard `<type>.check()` method.
   * @returns {array} `value`.
   */
  static check(value, elementCheck = null) {
    if (!Array.isArray(value)) {
      return TypeError.badValue(value, 'Array');
    }

    if (elementCheck !== null) {
      // **Note:** `in` not `of` because we will check named properties too.
      for (const k in value) {
        elementCheck(value[k]);
      }
    }

    return value;
  }
}