// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TInt, TypeError } from 'typecheck';

/**
 * Type representation of version numbers. The values themselves are always
 * just non-negative integers. This is just where the type checker code lives.
 */
export default class VersionNumber {
  /**
   * Checks a value of type `VersionNumber`.
   *
   * @param {*} value Value to check.
   * @param {Int} [max] Maximum acceptable value (inclusive). If `undefined`,
   *   there is no upper limit.
   * @returns {Int} `value`.
   */
  static check(value, max = undefined) {
    if (   (typeof value !== 'number')
        || !Number.isSafeInteger(value)
        || (value < 0)) {
      return TypeError.badValue(value, 'VersionNumber');
    }

    if ((max !== undefined) && TInt.check(max) && (value > max)) {
      return TypeError.badValue(value, 'VersionNumber', `value <= ${max}`);
    }

    return value;
  }

  /**
   * Checks a value of type `VersionNumber`, which must furthermore be no more
   * than an indicated value (inclusive).
   *
   * @param {*} value Value to check.
   * @param {Int} maxInc Maximum acceptable value (inclusive).
   * @returns {Int} `value`.
   */
  static maxInc(value, maxInc) {
    try {
      return TInt.rangeInc(value, 0, maxInc);
    } catch (e) {
      return TypeError.badValue(value, 'VersionNumber', `value <= ${maxInc}`);
    }
  }

  /**
   * Checks a value of type `VersionNumber`, which is allowed to be `null`.
   *
   * @param {*} value Value to check.
   * @returns {Int|null} `value` or `null`.
   */
  static orNull(value) {
    try {
      return (value === null)
        ? null
        : VersionNumber.check(value);
    } catch (e) {
      // More appropriate error.
      return TypeError.badValue(value, 'VersionNumber|null');
    }
  }

  /**
   * Checks a value of type `VersionNumber`, which must furthermore be within an
   * indicated inclusive-inclusive range.
   *
   * @param {*} value Value to check.
   * @param {Int} minInc Minimum acceptable value (inclusive).
   * @param {Int} maxInc Maximum acceptable value (inclusive).
   * @returns {Int} `value`.
   */
  static rangeInc(value, minInc, maxInc) {
    try {
      return VersionNumber.check(TInt.rangeInc(value, minInc, maxInc));
    } catch (e) {
      // More appropriate error.
      return TypeError.badValue(value, 'VersionNumber', `${minInc} <= value <= ${maxInc}`);
    }
  }

  /**
   * Returns the version number after the given one. This is the same as
   * `verNum + 1` _except_ that `null` (the version "number" for an empty
   * document) is a valid input for which `0` is the return value.
   *
   * **Note:** Unlike the rest of the methods in this class, this one isn't a
   * simple data validator. (TODO: This arrangement is error prone and should
   * be reconsidered.)
   *
   * @param {Int|null} verNum Starting version number.
   * @returns {Int} The version number immediately after `verNum`
   */
  static after(verNum) {
    return (verNum === null) ? 0 : (VersionNumber.check(verNum) + 1);
  }
}
