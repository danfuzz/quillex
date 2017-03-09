// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TObject } from 'typecheck';

import Target from './Target';

/**
 * Binding context for an API server or session therein. This is pretty much
 * just a map from IDs to `Target` instances, along with reasonably
 * straightforward accessor and update methods.
 *
 * As a convention, `main` is the ID of the object providing the main
 * functionality, and `meta` provides meta-information and meta-control.
 */
export default class Context {
  /**
   * Checks that a value is an instance of this class. Throws an error if not.
   *
   * @param {*} value Value to check.
   * @returns {DocumentChange} `value`.
   */
  static check(value) {
    return TObject.check(value, Context);
  }

  /**
   * Constructs an instance which is initially empty.
   */
  constructor() {
    /** {Map<string,Target>} The underlying map. */
    this._map = new Map();

    Object.freeze(this);
  }

  /**
   * Adds an already-constructed `Target` to the map. This will throw an error
   * if there is already another target with the same ID.
   *
   * @param {Target} target Target to add.
   */
  addTarget(target) {
    TObject.check(target, Target);
    const id = target.id;

    if (this._map.get(id) !== undefined) {
      throw new Error(`Duplicate target: \`${id}\``);
    }

    this._map.set(id, target);
  }

  /**
   * Adds a new target to the instance. This will throw an error if there is
   * already another target with the same ID. This is a convenience for calling
   * `map.addTarget(new Target(id, obj))`.
   *
   * @param {string} nameOrKey Either the name of the target (if
   *   uncontrolled) _or_ the key which controls access to the target. See the
   *   docs for `Target.add()` for more details.
   * @param {object} obj Object to ultimately call on.
   */
  add(nameOrKey, obj) {
    TObject.check(obj);
    this.addTarget(new Target(nameOrKey, obj));
  }

  /**
   * Gets the target associated with the indicated ID. This will throw an
   * error if the so-identified target does not exist.
   *
   * @param {string} id The target ID.
   * @returns {object} The so-identified target.
   */
  get(id) {
    const result = this.getOrNull(id);

    if (!result) {
      throw new Error(`Unknown target: \`${id}\``);
    }

    return result;
  }

  /**
   * Gets the target associated with the indicated ID, or `null` if the
   * so-identified target does not exits.
   *
   * @param {string} id The target ID.
   * @returns {object|null} The so-identified target.
   */
  getOrNull(id) {
    const result = this._map.get(id);
    return (result !== undefined) ? result : null;
  }

  /**
   * Gets the target associated with the indicated ID, but only if it is
   * uncontrolled (that is, no auth required). This will throw an error if the
   * so-identified target does not exist.
   *
   * @param {string} id The target ID.
   * @returns {object} The so-identified target.
   */
  getUncontrolled(id) {
    const result = this.get(id);

    if (result.key !== null) {
      throw new Error(`Unauthorized target: \`${id}\``);
    }

    return result;
  }

  /**
   * Returns an indication of whether or not this instance has a binding for
   * the given ID.
   *
   * @param {string} id The target ID.
   * @returns {boolean} `true` iff `id` is bound.
   */
  hasId(id) {
    return this.getOrNull(id) !== null;
  }

  /**
   * Clones this instance. The resulting clone has a separate underlying map.
   * That is, adding targets to the clone does not affect its progenitor.
   *
   * @returns {Context} The newly-cloned instance.
   */
  clone() {
    const result = new Context();

    for (const t of this._map.values()) {
      result.addTarget(t);
    }

    return result;
  }
}
