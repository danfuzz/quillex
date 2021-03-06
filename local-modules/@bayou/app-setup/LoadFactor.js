// Copyright 2016-2019 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { DocComplex } from '@bayou/doc-server';
import { TInt, TObject } from '@bayou/typecheck';
import { CommonBase } from '@bayou/util-common';

/**
 * {Int} The number of active connections (websockets) which should be
 * considered to constitute a "heavy load."
 */
const HEAVY_CONNECTION_COUNT = 400;

/**
 * {Int} The number of active files or documents ("major items") which should be
 * considered to constitute a "heavy load."
 */
const HEAVY_MAJOR_ITEM_COUNT = 4000;

/**
 * {Int} The number of document sessions which should be considered to
 * constitute a "heavy load."
 */
const HEAVY_SESSION_COUNT = 5000;

/**
 * {Int} The total rough size (across all documents) which should be considered
 * to constitute a "heavy load." This is defined as a multiple of the
 * per-document "huge rough size."
 */
const HEAVY_ROUGH_SIZE = DocComplex.ROUGH_SIZE_HUGE * 100;

/**
 * Synthesizer of the high-level "load factor" based on various stats on what
 * this server is up to.
 */
export class LoadFactor extends CommonBase {
  /**
   * {Int} Value of {@link #_value} above which the system should be considered
   * "under heavy load."
   */
  static get HEAVY_LOAD_VALUE() {
    return 100;
  }

  /**
   * Constructs an instance.
   */
  constructor() {
    super();

    /** {Int} Current (latest calculated) load factor. */
    this._value = 0;

    /** {Int} Active connection count. */
    this._connectionCount = 0;

    /** {Int} {@link DocServer} resource consumption stat. */
    this._documentCount = 0;

    /** {Int} {@link BaseFile} resource consumption stat. */
    this._fileCount = 0;

    /**
     * {Int} {@link DocServer} and {@link BaseFile} resource consumption stat.
     */
    this._roughSize = 0;

    /** {Int} {@link DocServer} resource consumption stat. */
    this._sessionCount = 0;

    Object.seal(this);
  }

  /** {Int} The current (latest calculated) load factor. */
  get value() {
    return this._value;
  }

  /**
   * Updates this instance with respect to the number of active websocket
   * connections.
   *
   * @param {Int} count Current number of active websocket connections.
   */
  activeConnections(count) {
    TInt.nonNegative(count);

    this._connectionCount = count;
    this._recalc();
  }

  /**
   * Updates this instance based on the given resource consumption stats.
   *
   * @param {object} docServerStats Stats, per the contract of {@link
   *   DocServer#currentResourceConsumption}.
   * @param {object} fileStoreStats Stats, per the contract of {@link
   *   BaseFileStore#currentResourceConsumption}.
   */
  resourceConsumption(docServerStats, fileStoreStats) {
    TObject.check(docServerStats);
    TObject.check(fileStoreStats);

    let roughSize = 0;

    if (docServerStats.documentCount !== undefined) {
      this._documentCount = TInt.nonNegative(docServerStats.documentCount);
    }

    if (docServerStats.roughSize !== undefined) {
      roughSize = TInt.nonNegative(docServerStats.roughSize);
    }

    if (docServerStats.sessionCount !== undefined) {
      this._sessionCount = TInt.nonNegative(docServerStats.sessionCount);
    }

    if (fileStoreStats.fileCount !== undefined) {
      this._fileCount = TInt.nonNegative(fileStoreStats.fileCount);
    }

    if (fileStoreStats.roughSize !== undefined) {
      roughSize += TInt.nonNegative(fileStoreStats.roughSize);
    }

    if (roughSize !== 0) {
      this._roughSize = roughSize;
    }

    this._recalc();
  }

  /**
   * (Re)calculates {@link #value} based on currently-known stats.
   *
   * What we do is define N independent numeric stats each of which has a value
   * beyond which it is considered "heavy load." These each scaled so that the
   * "heavy load" value maps to {@link #HEAVY_LOAD_VALUE}, and then they're
   * simply summed. This means that (a) all stats always contribute to the final
   * load factor value, and (b) each stat can _independently_ cause the final
   * load factor to be in the "heavy load" zone.
   *
   * **TODO:** This calculation definitely needs adjustment, and it's
   * specifically worth considering whether each factor should be scaled
   * (independently), instead of sorta-kinda building a scale factor into the
   * base `HEAVY_*` constants.
   *
   * **TODO:** Consider whether we want to have a way to factor in the "machine
   * size," and if so how best to do that.
   */
  _recalc() {
    // Get each of these as a fraction where `0` is "unloaded" and `1` is heavy
    // load.
    const connectionCount = this._connectionCount / HEAVY_CONNECTION_COUNT;
    const roughSize       = this._roughSize       / HEAVY_ROUGH_SIZE;
    const sessionCount    = this._sessionCount    / HEAVY_SESSION_COUNT;

    // Because the document and file counts really ought to pretty much track
    // each other (that is, be very nearly the same value almost all the time),
    // just take a max of the two and treat it as a single stat.
    const majorItemCount =
      Math.max(this._documentCount, this._fileCount) / HEAVY_MAJOR_ITEM_COUNT;

    // Total load.
    const total = connectionCount + majorItemCount + roughSize + sessionCount;

    // Total load, scaled so that heavy load is at the documented
    // `HEAVY_LOAD_VALUE`, and rounded to an int. `ceil()` so that a tiny but
    // non-zero load will show up as `1` and not `0`.
    const loadFactor = Math.ceil(total * LoadFactor.HEAVY_LOAD_VALUE);

    this._value = loadFactor;
  }
}
