// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { BaseKey, Decoder, Encoder, Message } from 'api-common';
import { Logger } from 'see-all';
import { TString } from 'typecheck';
import { WebsocketCodes } from 'util-common';

import ApiError from './ApiError';
import TargetMap from './TargetMap';

/** Logger. */
const log = new Logger('api');

/** Value used for an unknown connection ID. */
const UNKNOWN_CONNECTION_ID = 'id-unknown';

/**
 * Connection with the server, via a websocket.
 */
export default class ApiClient {
  /**
   * Constructs an instance. This instance will connect to a websocket at the
   * same domain at the path `/api`. Once this constructor returns, it is safe
   * to call any API methods on the instance's associated `target`. If the
   * socket isn't yet ready for traffic, the messages will get enqueued and then
   * replayed in order once the socket becomes ready.
   *
   * @param {string} url The server origin, as an `http` or `https` URL.
   */
  constructor(url) {
    /** {string} Base URL for the server. */
    this._baseUrl = ApiClient._getBaseUrl(url);

    /**
     * {string|null} Connection ID conveyed to us by the server. Set / reset in
     * `_resetConnection()`.
     */
    this._connectionId = null;

    /** {Logger} Logger which prefixes everything with the connection ID. */
    this._log = log.withDynamicPrefix(() => [`[${this._connectionId}]`]);

    /**
     * {WebSocket} Actual websocket instance. Set by `open()`. Reset in
     * `_resetConnection()`.
     */
    this._ws = null;

    /**
     * {Int} Next message ID to use when sending a message. Initialized and
     * reset in `_resetConnection()`.
     */
    this._nextId = 0;

    /**
     * {object<Int,{resolve, reject}>} Map from message IDs to response
     * callbacks. Each callback is an object that maps `resolve` and `reject` to
     * functions that obey the usual promise contract for functions of those
     * names. Initialized and reset in `_resetConnection()`.
     */
    this._callbacks = null;

    /**
     * {array<string>} List of pending payloads (to be sent to the far side of
     * the connection). Only used when connection is in the middle of being
     * established. Initialized and reset in `_resetConnection()`.
     */
    this._pendingPayloads = null;

    /** {TargetMap} Map of names to target proxies. */
    this._targets = new TargetMap(this);

    // Initialize the active connection fields (described above).
    this._resetConnection();
  }

  /** {string} Base URL for the remote endpoint this client gets attached to. */
  get baseUrl() {
    return this._baseUrl;
  }

  /**
   * Performs a challenge-response authorization for a given key. When the
   * returned promise resolves successfully, that means that the corresponding
   * target (that is, `this.getTarget(key)`) can be accessed without further
   * authorization.
   *
   * If `key.id` is already mapped by this instance, the corresponding target
   * is returned directly without further authorization. (That is, this method
   * is idempotent.)
   *
   * @param {BaseKey} key Key to authorize with.
   * @returns {Promise<Proxy>} Promise which resolves to the proxy that
   *   represents the foreign target which is controlled by `key`, once
   *   authorization is complete.
   */
  authorizeTarget(key) {
    // Just pass through to the target map.
    return this._targets.authorizeTarget(key);
  }

  /**
   * {string} The connection ID if known, or a reasonably suggestive string if
   * not. This class automatically sets the ID when connections get made, so
   * that clients don't generally have to make an API call to get this info.
   */
  get connectionId() {
    return this._connectionId;
  }

  /**
   * Gets a proxy for the target with the given ID or which is controlled by the
   * given key (or which was so controlled prior to authorizing it away). The
   * target must already have been authorized for this method to work (otherwise
   * it is an error); use `authorizeTarget()` to perform authorization.
   *
   * @param {string|BaseKey} idOrKey ID or key for the target.
   * @returns {Proxy} Proxy which locally represents the so-identified
   *   server-side target.
   */
  getTarget(idOrKey) {
    const id = (idOrKey instanceof BaseKey)
      ? idOrKey.id
      : TString.check(idOrKey);

    return this._targets.get(id);
  }

  /**
   * {Logger} The client-specific logger.
   */
  get log() {
    return this._log;
  }

  /**
   * {Proxy} The object upon which meta-API calls can be made.
   */
  get meta() {
    return this._targets.get('meta');
  }

  /**
   * Opens the websocket. Once open, any pending messages will get sent to the
   * server side. If the socket is already open (or in the process of opening),
   * this does not re-open (that is, the existing open is allowed to continue).
   *
   * @returns {Promise} A promise for the result of opening. This will resolve
   * as a `true` success or fail with an `ApiError`.
   */
  open() {
    // If `_ws` is `null` that means that the connection is not already open or
    // in the process of opening.

    if (this._ws !== null) {
      // Already open(ing). Just return an appropriately-behaved promise.
      this._log.detail('open() called while already opening.');
      return this.meta.ping();
    }

    this._ws = new WebSocket(this._websocketUrl);
    this._ws.onclose   = this._handleClose.bind(this);
    this._ws.onerror   = this._handleError.bind(this);
    this._ws.onmessage = this._handleMessage.bind(this);
    this._ws.onopen    = this._handleOpen.bind(this);

    this._log.detail('Opening connection...');

    return this.meta.connectionId().then((value) => {
      this._connectionId = value;
      this._log.info('Open.');
      return true;
    });
  }

  /**
   * Gets the base URL for the given original URL.
   *
   * @param {string} origUrl The original URL.
   * @returns {string} The corresponding base URL.
   */
  static _getBaseUrl(origUrl) {
    return new URL(origUrl).origin;
  }

  /** {string} The websocket URL for this instance. */
  get _websocketUrl() {
    const url = new URL(this._baseUrl);

    // Convert the URL scheme to either `ws` or `wss`, corresponding to `http`
    // or `https`.
    url.protocol = url.protocol.replace(/^http/, 'ws');

    // Drop the original path, and replace it with just `/api`.
    url.pathname = '/api';

    return url.href;
  }

  /**
   * Init or reset the state having to do with an active connection. See the
   * constructor for documentation about these fields.
   */
  _resetConnection() {
    this._ws              = null;
    this._connectionId    = UNKNOWN_CONNECTION_ID;
    this._nextId          = 0;
    this._callbacks       = {};
    this._pendingPayloads = [];
    this._targets.reset();
  }

  /**
   * Constructs an `ApiError` representing a connection error and including
   * the current connection ID in the description.
   *
   * @param {string} code Short error code.
   * @param {string} desc Longer-form description.
   * @returns {ApiError} An appropriately-constructed instance.
   */
  _connError(code, desc) {
    return ApiError.connError(code, `[${this._connectionId}] ${desc}`);
  }

  /**
   * Sends the given call to the server.
   *
   * @param {string} target Name of the target object.
   * @param {string} action Action to invoke.
   * @param {string} name Name of method (or meta-method) to call on the server.
   * @param {object} [args = []] API-encodable object of arguments.
   * @returns {Promise} Promise for the result (or error) of the call. In the
   *   case of an error, the rejection reason will always be an instance of
   *   `ApiError` (see which for details).
   */
  _send(target, action, name, args = []) {
    const wsState = this._ws.readyState;

    // Handle the cases where socket shutdown is imminent or has already
    // happened. We don't just `throw` directly here, so that clients can
    // consistently handle errors via one of the promise chaining mechanisms.
    switch (wsState) {
      case WebSocket.CLOSED: {
        return Promise.reject(this._connError('closed', 'Closed.'));
      }
      case WebSocket.CLOSING: {
        return Promise.reject(this._connError('closing', 'Closing.'));
      }
    }

    const id = this._nextId;
    this._nextId++;

    const payloadObj = new Message(id, target, action, name, args);
    const payload = Encoder.encodeJson(payloadObj);

    switch (wsState) {
      case WebSocket.CONNECTING: {
        // Not yet open. Need to queue it up.
        this._log.detail('Queued:', payloadObj);
        this._pendingPayloads.push(payload);
        break;
      }
      case WebSocket.OPEN: {
        this._log.detail('Sent:', payloadObj);
        this._ws.send(payload);
        break;
      }
      default: {
        // Whatever this state is, it's not documented as part of the websocket
        // spec!
        this._log.wtf(`Weird state: ${wsState}`);
      }
    }

    return new Promise((resolve, reject) => {
      this._callbacks[id] = { resolve, reject };
    });
  }

  /**
   * Common code to handle both `error` and `close` events.
   *
   * @param {object} event_unused Event that caused this callback.
   * @param {ApiError} error Reason for termination. "Error" is a bit of a
   *   misnomer, as in many cases termination is a-okay.
   */
  _handleTermination(event_unused, error) {
    // Reject the promises of any currently-pending messages.
    for (const id in this._callbacks) {
      this._callbacks[id].reject(error);
    }

    // Clear the state related to the websocket. It is safe to re-open the
    // connection after this.
    this._resetConnection();
  }

  /**
   * Handles a `close` event coming from a websocket. This logs the closure and
   * terminates all active messages by rejecting their promises.
   *
   * @param {object} event Event that caused this callback.
   */
  _handleClose(event) {
    this._log.info('Closed:', event);

    const code = WebsocketCodes.close(event.code);
    const reason = event.reason || 'Websocket closed.';
    const error = ApiError.connError(code, reason);

    this._handleTermination(event, error);
  }

  /**
   * Handles an `error` event coming from a websocket. This behaves similarly
   * to the `close` event.
   *
   * **Note:** Because errors in this case are typically due to transient
   * connection issues (e.g. network went away) and not due to fundamental
   * system issues, this is logged as `info` and not `error` (or `warn`).
   *
   * @param {object} event Event that caused this callback.
   */
  _handleError(event) {
    this._log.info('Error:', event);

    // **Note:** The error event does not have any particularly useful extra
    // info, so -- alas -- there is nothing to get out of it for the `ApiError`
    // description.
    const error = this._connError('error', 'Unknown error.');
    this._handleTermination(event, error);
  }

  /**
   * Handles an `open` event coming from a websocket. In this case, it sends
   * any pending payloads (messages that were enqueued while the socket was
   * still in the process of opening).
   *
   * @param {object} event_unused Event that caused this callback.
   */
  _handleOpen(event_unused) {
    for (const payload of this._pendingPayloads) {
      this._log.detail('Sent from queue:', payload);
      this._ws.send(payload);
    }
    this._pendingPayloads = [];
  }

  /**
   * Handles a `message` event coming from a websocket. In this case, messages
   * are expected to be the responses from previously-sent messages (e.g.
   * method calls), encoded as JSON. The `id` of the response is used to look up
   * the callback function in `this._callbacks`. That callback is then called in
   * a separate turn.
   *
   * @param {object} event Event that caused this callback.
   */
  _handleMessage(event) {
    this._log.detail('Received raw payload:', event.data);

    const payload = Decoder.decodeJson(event.data);
    const id = payload.id;
    let result = payload.result;
    const error = payload.error;

    if (result === undefined) {
      result = null;
    }

    if (typeof id !== 'number') {
      // We handle these as a `server_bug` and not, e.g. logging as `wtf()` and
      // aborting, because this is indicative of a server-side problem and not
      // an unrecoverable local problem.
      if (!id) {
        throw this._connError('server_bug', 'Missing ID on API response.');
      } else {
        throw this._connError('server_bug',
          `Strange ID type \`${typeof id}\` on API response.`);
      }
    }

    const callback = this._callbacks[id];
    if (callback) {
      delete this._callbacks[id];
      if (error) {
        this._log.detail(`Reject ${id}:`, error);
        callback.reject(ApiError.appError('app_error', error));
      } else {
        this._log.detail(`Resolve ${id}:`, result);
        callback.resolve(result);
      }
    } else {
      // See above about `server_bug`.
      throw this._connError('server_bug', `Orphan call for ID ${id}.`);
    }
  }
}
