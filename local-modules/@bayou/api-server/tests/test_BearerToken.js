// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { BearerToken } from '@bayou/api-server';
import { Auth } from '@bayou/config-server';

function exampleTokens() {
  return Auth.exampleTokens;
}

function exampleToken() {
  return exampleTokens()[0];
}


describe('@bayou/api-server/BearerToken', () => {
  describe('constructor()', () => {
    it('should reject syntactically invalid secrets', () => {
      const badToken = `~!bad!token!~${exampleToken().slice(0, 8)}`;
      assert.throws(() => new BearerToken(badToken));
    });

    it('should return a frozen instance of BearerToken', () => {
      const token = new BearerToken(exampleToken());

      assert.instanceOf(token, BearerToken);
      assert.isFrozen(token);
    });
  });

  describe('.secretToken', () => {
    it('should return the token provided to the constructor', () => {
      const token = new BearerToken(exampleToken());

      assert.strictEqual(token.secretToken, exampleToken());
    });
  });

  describe('sameToken()', () => {
    it('should return false when passed `null`', () => {
      const token = new BearerToken(exampleToken());

      assert.isFalse(token.sameToken(null));
    });

    it('should return false when passed `undefined`', () => {
      const token = new BearerToken(exampleToken());

      assert.isFalse(token.sameToken(undefined));
    });

    it('should return `false` when passed a token with a different secret key', () => {
      const token = new BearerToken(exampleTokens()[0]);
      const other = new BearerToken(exampleTokens()[1]);

      assert.isFalse(token.sameToken(other));
    });

    it('should return `true` when passed a token with the same secret key', () => {
      const token = new BearerToken(exampleToken());
      const other = new BearerToken(exampleToken());

      assert.isTrue(token.sameToken(other));
    });
  });

  describe('sameArrays()', () => {
    it('should return `false` given arrays that are different lengths', () => {
      const token1 = new BearerToken(exampleTokens()[0]);
      const token2 = new BearerToken(exampleTokens()[1]);
      const token3 = new BearerToken(exampleTokens()[0]);
      const token4 = new BearerToken(exampleTokens()[1]);

      const array1 = [token1, token2, token3, token4];
      const array2 = [token1, token2, token3];

      assert.isFalse(BearerToken.sameArrays(array1, array2));
    });

    it('should throw an Error if given arrays that contain things other than `BearerToken`s', () => {
      const token = new BearerToken(exampleToken());

      const array1 = [token, 'a'];
      const array2 = [token, 'a'];

      assert.throws(() => BearerToken.sameArrays(array1, array2));
    });

    it('should return `true` given identically-constructed arrays of `BearerToken`s', () => {
      const token1 = new BearerToken(exampleTokens()[0]);
      const token2 = new BearerToken(exampleTokens()[1]);
      const token3 = new BearerToken(exampleTokens()[0]);
      const token4 = new BearerToken(exampleTokens()[1]);

      const array1 = [token1, token2, token3, token4];
      const array2 = [token1, token2, token3, token4];

      assert.isTrue(BearerToken.sameArrays(array1, array2));
    });
  });
});
