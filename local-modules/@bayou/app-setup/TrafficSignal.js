// Copyright 2016-2019 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TBoolean, TInt } from '@bayou/typecheck';
import { CommonBase, Errors } from '@bayou/util-common';

/**
 * {Int} Minimum amount of time (in msec) that the traffic signal must be `true`
 * for after transitioning from `false`, assuming that the server isn't either
 * unhealthy or in the process of shutting down.
 */
const MINIMUM_TRAFFIC_ALLOW_TIME_MSEC = 60 * 1000; // One minute.

/**
 * Synthesizer of the high-level "traffic signal" based on various stats on what
 * this server is up to. A little more detail:
 *
 * An instance of this class gets hooked up to the monitor endpoint
 * `/traffic-signal` (see {@link Monitor}). That endpoint is meant to be used by
 * reverse proxies that front a fleet of instances of this product, in order to
 * determine which instances are safe to route traffic to. Under low or normal
 * load, the traffic signal is "go;" and when an instance becomes too loaded,
 * the signal is "stop."
 *
 * This class is set up so that the signal is never permanently set at "stop"
 * based on the perceived load,  even when under very heavy load. This is meant
 * to prevent a cross-fleet heavy load from turning into a complete outage. That
 * is, we do not assume that the incoming heavy load indicator is a perfect
 * metric, and we _do_ assume that it's better to continue to accept new traffic
 * (and, approximately, risk server meltdown) than to over-prophylactically
 * totally stop answering requests.
 *
 * In addition to using the high-level load factor to determine traffic flow,
 * this instance also pays attention to the self-assessed server "health" value,
 * _and_ whether or not the system is in the process of shutting down. With
 * both of these, the appropriate signal _does_ turn into a permanent "stop"
 * signal.
 */
export class TrafficSignal extends CommonBase {
  /**
   * Constructs an instance.
   */
  constructor() {
    super();

    /**
     * {boolean} Current traffic flow signal; `true` indicates that traffic is
     * allowed.
     */
    this._allowTraffic = true;

    /**
     * {Int} Wall time in msec since the Unix Epoch indicating the _next_ moment
     * when traffic should be allowed, if it is not currently allowed. This
     * value only has meaning when {@link #_allowTraffic} is `false`.
     */
    this._allowTrafficAtMsec = 0;

    /**
     * {Int} Wall time in msec before which {@link #_allowTraffic} is forced to
     * be `true` (based on load factor). This value only has meaning when
     * {@link #_allowTraffic} is `true`.
     */
    this._forceTrafficUntilMsec = 0;

    /**
     * {boolean} Whether (`true`) or not (`false`) the system is currently
     * shutting down.
     */
    this._shuttingDown = false;

    /**
     * {boolean} Whether (`true`) or not (`false`) the system currently
     * considers itself to be "healthy."
     */
    this._healthy = true;

    /** {Int} Most recently reported high-level load factor. */
    this._loadFactor = 0;

    /**
     * {Int} Wall time in msec since the Unix Epoch, as passed to the most
     * recent call to {@link #allowTrafficAt}.
     */
    this._currentTimeMsec = 0;

    Object.seal(this);
  }

  /**
   * Indicates the current wall time, and gets back an indicator of whether or
   * not to allow traffic at the moment in question.
   *
   * **Note:** This method is arranged the way it is (that is, to take a time),
   * specifically so that the class does not have a built-in dependency on
   * `Date.now()` (or similar), so that it is more easily testable / tested.
   *
   * @param {Int} timeMsec The current wall time, as msec since the Unix Epoch.
   * @returns {boolean} Indication of whether (`true`) or not (`false`) traffic
   *   should be allowed as of `timeMsec`.
   */
  allowTrafficAt(timeMsec) {
    TInt.nonNegative(timeMsec);

    if (timeMsec < this._currentTimeMsec) {
      throw Errors.badUse('`timeMsec` must monotonically increase from call to call.');
    }

    this._currentTimeMsec = timeMsec;
    this._recalc();

    return this._allowTraffic;
  }

  /**
   * Indicates to this instance the current self-assessed health of this server.
   *
   * @param {boolean} healthy `true` if this server considers itself "healthy"
   *   or `false` if not.
   */
  health(healthy) {
    this._healthy = TBoolean.check(healthy);
  }

  /**
   * Indicates to this instance that this server is shutting down.
   */
  shuttingDown() {
    this._shuttingDown = true;
  }

  /**
   * Indicates to this instance the current high-level load factor.
   *
   * @param {Int} loadFactor The current load factor.
   */
  loadFactor(loadFactor) {
    TInt.nonNegative(loadFactor);

    this._loadFactor = loadFactor;
  }

  /**
   * Recalculates the traffic signal based on currently-known stats.
   */
  _recalc() {
    if (this._shuttingDown || !this._healthy) {
      this._allowTraffic       = false;
      this._allowTrafficAtMsec = Number.MAX_SAFE_INTEGER; // ...which is to say, "never."
      return;
    }

    if (this._allowTraffic) {
      if (this._currentTimeMsec < this._forceTrafficUntilMsec) {
        // See explanation below and in the class header comment.
        return;
      }
    } else {
      if (this._currentTimeMsec >= this._allowTrafficAtMsec) {
        // This says in effect, "When the traffic signal goes from `false` to
        // `true`, it must be allowed to stay `true` for a minimum-specified
        // period of time." See class header comment for the rationale for this
        // behavior.
        this._allowTraffic = true;
        this._forceTrafficUntilMsec = this._currentTimeMsec + MINIMUM_TRAFFIC_ALLOW_TIME_MSEC;
        return;
      }
    }

    // **TODO:** Depend on the load factor. Set `_allowTraffic` to `false` and
    // set up an appropriate `_allowTrafficAtMsec`, should the load factor turn
    // out to be too high.

    this._allowTraffic = true;
  }
}
