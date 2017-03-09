// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TString } from 'typecheck';

import DocControl from './DocControl';

/**
 * Controller for a given document, which acts on behalf of one specific author.
 * This passes non-mutating methods through to the underlying `DocControl` while
 * implicitly adding an author argument to methods that modify the document.
 */
export default class DocForAuthor {
  /**
   * Constructs an instance.
   *
   * @param {DocControl} doc The underlying document controller.
   * @param {string} authorId The author this instance acts on behalf of.
   */
  constructor(doc, authorId) {
    /** {DocControl} The underlying document controller. */
    this._doc = DocControl.check(doc);

    /** {string} Author ID. */
    this._authorId = TString.nonempty(authorId);
  }

  /**
   * The version number corresponding to the current (latest) version of the
   * document.
   */
  get currentVerNum() {
    return this._doc.currentVerNum;
  }

  /**
   * The version number corresponding to the very next change that will be
   * made to the document.
   */
  get nextVerNum() {
    return this._doc.nextVerNum;
  }

  /**
   * Returns a particular change to the document. See the equivalent
   * `DocControl` method for details.
   *
   * @param {number} [verNum = this.currentVerNum] The version number of the
   *   change.
   * @returns {DocumentChange} An object representing that change.
   */
  change(verNum) {
    return this._doc.change(verNum);
  }

  /**
   * Returns a snapshot of the full document contents. See the equivalent
   * `DocControl` method for details.
   *
   * @param {number} [verNum = this.currentVerNum] Which version to get.
   * @returns {Snapshot} The corresponding snapshot.
   */
  snapshot(verNum) {
    return this._doc.snapshot(verNum);
  }

  /**
   * Returns a promise for a snapshot of any version after the given
   * `baseVerNum`. See the equivalent `DocControl` method for details.
   *
   * @param {number} baseVerNum Version number for the document.
   * @returns {Promise} A promise for a new version.
   */
  deltaAfter(baseVerNum) {
    return this._doc.deltaAfter(baseVerNum);
  }

  /**
   * Applies a delta, assigning authorship of the change to the author
   * represented by this instance. See the equivalent `DocControl` method for
   * details.
   *
   * @param {number} baseVerNum Version number which `delta` is with respect to.
   * @param {object} delta Delta indicating what has changed with respect to
   *   `baseVerNum`.
   * @returns {object} Object indicating the new latest version.
   */
  applyDelta(baseVerNum, delta) {
    return this._doc.applyDelta(baseVerNum, delta, this._authorId);
  }
}