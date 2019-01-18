// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { ApiClient } from '@bayou/api-client';
import { TheModule as appCommon_TheModule } from '@bayou/app-common';
import { SessionInfo } from '@bayou/doc-common';
import { Logger } from '@bayou/see-all';
import { CommonBase } from '@bayou/util-common';

import CaretTracker from './CaretTracker';
import PropertyClient from './PropertyClient';

/** Logger. */
const log = new Logger('doc');

/**
 * Manager of the API connection(s) needed to maintain a server session.
 */
export default class DocSession extends CommonBase {
  /**
   * Constructs an instance.
   *
   * @param {SessionInfo} info Info object that identifies the session and
   *   grants access to it. **Note:** A session is tied to a specific caret,
   *   which is associated with a single document and author. If passed an
   *   instance without a caret ID, then the act of establishing the session
   *   will cause a new caret to be created.
   */
  constructor(info) {
    super();

    /**
     * {SessionInfo} Identifying and authorizing information for the session.
     */
    this._sessionInfo = SessionInfo.check(info);

    /**
     * {Logger} Maximally-specific logger. **TODO:** Because {@link
     * #_sessionInfo} might not have a caret ID but the session will
     * _eventually_ have one, it probably doesn't make sense to have this
     * defined in this class.
     */
    this._log = log.withAddedContext(this._sessionInfo.logTag);

    /**
     * {ApiClient|null} API client instance. Set to non-`null` in
     * {@link #_getApiClient}.
     */
    this._apiClient = null;

    /**
     * {CaretTracker|null} Caret tracker for this session. Set to non-`null` in
     * the getter {@link #caretTracker}.
     */
    this._caretTracker = null;

    /**
     * {PropertyClient} Accessor (read and write) for the document properties
     * (metadata). Set to non-`null` in the getter {@link #propertyClient}.
     */
    this._propertyClient = null;

    /**
     * {Promise<Proxy>|null} Promise for the API session proxy. Set to
     * non-`null` in {@link #getSessionProxy}.
     */
    this._sessionProxyPromise = null;

    Object.seal(this);
  }

  /**
   * {Logger} Logger to use when handling operations related to this instance.
   * Logged messages include a reference to the session ID.
   */
  get log() {
    return this._log;
  }

  /** {CaretTracker} Caret tracker for this session. */
  get caretTracker() {
    if (this._caretTracker === null) {
      this._caretTracker = new CaretTracker(this);
    }

    return this._caretTracker;
  }

  /** {PropertyClient} Property accessor this session. */
  get propertyClient() {
    if (this._propertyClient === null) {
      this._propertyClient = new PropertyClient(this);
    }

    return this._propertyClient;
  }

  /**
   * {SessionInfo} Information which identifies and authorizes the session.
   */
  get sessionInfo() {
    return this._sessionInfo;
  }

  /**
   * Returns a proxy for the the server-side session object. This will cause the
   * API client connection to be established if it is not already established or
   * opening. The return value from this method always resolves to the same
   * proxy instance, and it will only ever perform authorization for the session
   * the first time it is called.
   *
   * @returns {Proxy} A proxy for the server-side session.
   */
  async getSessionProxy() {
    this._log.event.askedForSessionProxy();

    const api = this._getApiClient();

    if (this._sessionProxyPromise === null) {
      this._log.event.initialSessionSetup();
    } else {
      const proxy = await this._sessionProxyPromise;

      if (api.handles(proxy)) {
        // The session proxy we already had is still apparently valid, so it's
        // safe to return it.
        this._log.event.sessionStillValid();
        return proxy;
      }

      // Fall through to re-set-up the session.
      this._log.event.mustReestablishSession();
    }

    const info         = this._sessionInfo;
    const authorProxy  = api.getProxy(info.authorToken);
    const proxyPromise = (info.caretId === null)
      ? authorProxy.makeNewSession(info.documentId)
      : authorProxy.findExistingSession(info.documentId, info.caretId);

    this._log.event.usingInfo(info.logInfo);
    this._sessionProxyPromise = proxyPromise;

    // Log a note once the promise resolves.
    const proxy = await proxyPromise;
    this._log.event.gotSessionProxy();

    if (info.caretId === null) {
      // The session got started without a caret ID, which means a new caret
      // will have been created. Update `_sessionInfo` and `_log` accordingly.
      const caretId = await proxy.getCaretId();

      this._log.event.gotCaret(caretId);

      this._sessionInfo = info.withCaretId(caretId);
      this._log         = log.withAddedContext(this._sessionInfo.logTag);
    }

    return proxy;
  }

  /**
   * Makes sure the underlying server connection is in the process of being
   * established.
   */
  open() {
    this._log.event.askedToOpen();

    // This method ensures that, if the API client isn't yet constructed, or if
    // it had gotten closed, that it gets (re)constructed and (re)opened.
    this._getApiClient();
  }

  /**
   * API client instance to use. The client is not guaranteed to be fully open
   * at the time it is returned; however, `open()` will be _about_ to be called
   * on it (asynchronously), which means that it will at least be in the
   * _process_ of opening. In addition, it is always safe to enqueue messages on
   * an instance, even if not yet fully open (or even in the process of
   * opening).
   *
   * @returns {ApiClient} API client interface.
   */
  _getApiClient() {
    const url = this._sessionInfo.serverUrl;

    if ((this._apiClient === null) || !this._apiClient.isOpen()) {
      this._log.event.apiAboutToOpen(url);
      this._apiClient = new ApiClient(url, appCommon_TheModule.fullCodec);

      (async () => {
        try {
          this._log.event.apiOpening();
          await this._apiClient.open();
          this._log.event.apiOpened();
        } catch (e) {
          // (a) Log the problem, and (b) make sure an error doesn't percolate
          // back to the top as an uncaught promise rejection.
          this._log.event.apiOpenFailed();
        }
      })();
    } else {
      this._log.event.apiAlreadyOpen();
    }

    return this._apiClient;
  }
}
