// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import util from 'util';

import { Singleton } from 'util-common';

/**
 * Maximum amount of time, in msec, between successive logs that inidicate an
 * active spate of logging, and thus _should not_ be a cause for emitting a
 * `sink.time()` call.
 */
const LULL_MSEC = 60 * 1000; // One minute.

/**
 * Maximum amount of time, in msec, between `sink.time()` calls, even when there
 * is logging activity which is frequent enough not to run afoul of `LULL_MSEC`.
 * That is, if logging is chatty, there will still be calls to `sink.time()` at
 * about this frequency.
 */
const MAX_GAP_MSEC = 5 * 60 * 1000; // Five minutes.

/**
 * The timestamp of the most recently logged line.
 */
let lastNow = 0;

/**
 * Set of all logging sinks (final logging destinations). This is a
 * module-internal class whose functionality is effectively exposed by the
 * `SeeAll` and `Logger` classes.
 */
export default class AllSinks extends Singleton {
  /**
   * Constructs the instance.
   */
  constructor() {
    super();

    /**
     * {array<object>} The actual sinks to use.
     */
    this._sinks = [];

    Object.freeze(this);
  }

  /**
   * Adds a logging sink to the system.
   *
   * @param {object} sink The logging sink to use.
   */
  add(sink) {
    this._sinks.push(sink);
  }

  /**
   * Calls `log(nowMsec, ...args)` on each of the registered sinks, where
   * `nowMsec` represents the current time.
   *
   * @param {...*} args Arguments to pass to the sinks.
   */
  log(...args) {
    if (this._sinks.length === 0) {
      // Bad news! No sinks have yet been added. Typically indicates trouble
      // during init. Instead of silently succeeding (or at best succeeding
      // while logging to `console`), we die with an error here so that it is
      // reasonably blatant that something needs to be fixed during application
      // bootstrap.
      const details = util.inspect(args);
      throw new Error(`Overly early log call: ${details}`);
    }

    const nowMsec = this._nowMsec();

    for (const s of this._sinks) {
      s.log(nowMsec, ...args);
    }
  }

  /**
   * Gets a msec timestamp representing the current time, suitable for passing
   * as such to `sink.log()`. This will also generate `sink.time()` calls at
   * appropriate junctures to "punctuate" gaps.
   *
   * @returns {number} The timestamp.
   */
  _nowMsec() {
    const now = Date.now();

    if (now >= (lastNow + LULL_MSEC)) {
      // There was a lull between the last log and this one.
      this._callTime(now);
    } else {
      // Figure out where to "punctuate" longer spates of logging, such that the
      // timestamps come out even multiples of the maximum gap.
      const nextGapMarker = lastNow - (lastNow % MAX_GAP_MSEC) + MAX_GAP_MSEC;

      if (now >= nextGapMarker) {
        this._callTime(nextGapMarker);
      }
    }

    lastNow = now;
    return now;
  }

  /**
   * Calls `sink.time()` on all of the logging sinks.
   *
   * @param {number} now The time to pass.
   */
  _callTime(now) {
    // Note: We don't check to see if there are any sinks here. That check
    // gets done more productively in `log()`, above.

    const date = new Date(now);
    const utcString = AllSinks._utcTimeString(date);
    const localString = AllSinks._localTimeString(date);

    for (const s of this._sinks) {
      s.time(now, utcString, localString);
    }
  }

  /**
   * Returns a string representing the given time in UTC.
   *
   * @param {Date} date The time, as a `Date` object.
   * @returns {string} The corresponding UTC time string.
   */
  static _utcTimeString(date) {
    // We start with the ISO string and tweak it to be a little more
    // human-friendly.
    const isoString = date.toISOString();
    return isoString.replace(/T/, ' ').replace(/Z/, ' UTC');
  }

  /**
   * Returns a string representing the given time in the local timezone.
   *
   * @param {Date} date The time, as a `Date` object.
   * @returns {string} The corresponding local time string.
   */
  static _localTimeString(date) {
    // We start with the local time string and cut off all everything after the
    // actual time (timezone spew).
    const localString = date.toTimeString();
    return localString.replace(/ [^0-9].*$/, ' local');
  }
}