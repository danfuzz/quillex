// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TokenAuthorizer } from '@bayou/api-server';
import { Auth } from '@bayou/config-server';

import Application from './Application';

/**
 * Application-specific implementation of {@link TokenAuthorizer}.
 */
export default class AppAuthorizer extends TokenAuthorizer {
  /**
   * Constructs an instance.
   *
   * @param {Application} application The main application instance that this
   *   instance is associated with.
   */
  constructor(application) {
    super();

    /** {Application} The main application. */
    this._application = Application.check(application);

    Object.freeze(this);
  }

  /**
   * @override
   * @param {string} tokenString The alleged token string.
   * @returns {boolean} `true` iff `tokenString` has valid token syntax.
   */
  _impl_isToken(tokenString) {
    return Auth.isToken(tokenString);
  }

  /**
   * @override
   * @param {BearerToken} token Token to look up.
   * @returns {object|null} If `token` grants any authority, an object which
   *   exposes the so-authorized functionality, or `null` if no authority is
   *   granted.
   */
  async _impl_targetFromToken(token) {
    console.log('======= auth', token);
    const authority = await Auth.tokenAuthority(token);
    console.log('======= auth got', authority);

    if (authority.type === Auth.TYPE_root) {
      return this._application.rootAccess;
    }

    // No other token type grants authority... yet.
    return null;
  }

  /**
   * @override
   * @param {string} tokenString The alleged token string.
   * @returns {BearerToken} An appropriately-constructed instance.
   */
  _impl_tokenFromString(tokenString) {
    return Auth.tokenFromString(tokenString);
  }
}
