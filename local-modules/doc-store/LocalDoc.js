// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import BaseDoc from './BaseDoc';

/**
 * Base class representing access to a particular document. Subclasses must
 * override several methods defined by this class, as indicated in the
 * documentation.
 */
export default class LocalDoc extends BaseDoc {
  /**
   * Constructs an instance.
   *
   * @param {string} docId The ID of the document this instance represents.
   */
  constructor(docId) {
    super(docId);

    /** Document exists? */
    this._exists = false;

    /**
     * Array of changes. Index `n` contains the change that produces version
     * number `n`.
     */
    this._changes = [];
  }

  /**
   * Implementation as required by the superclass.
   *
   * @returns {boolean} `true` iff this document exists.
   */
  _impl_exists() {
    return this._exists;
  }

  /**
   * Implementation as required by the superclass.
   */
  _impl_create() {
    this._exists = true;
    this._changes = [];
  }

  /**
   * Implementation as required by the superclass.
   *
   * @returns {int} The version number of this document.
   */
  _impl_currentVerNum() {
    return this._changes.length - 1;
  }

  /**
   * Implementation as required by the superclass.
   *
   * @param {int} verNum The version number for the desired change.
   * @returns {DocumentChange|null|undefined} The change with `verNum` as
   *   indicated or a nullish value if there is no such change.
   */
  _impl_changeRead(verNum) {
    return this._changes[verNum];
  }

  /**
   * Implementation as required by the superclass.
   *
   * @param {DocumentChange} change The change to write.
   */
  _impl_changeWrite(change) {
    this._changes[change.verNum] = change;
  }
}
