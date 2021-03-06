// Copyright 2016-2019 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { TObject } from '@bayou/typecheck';

describe('@bayou/typecheck/TObject', () => {
  describe('check(value)', () => {
    it('returns the provided value when passed an object', () => {
      function test(value) {
        assert.strictEqual(TObject.check(value), value);
      }

      test({ a: 1, b: 2 });
      test([1, 2, 3]);
      test(() => 123);
      test(new Map());
    });

    it('throws an Error when passed anything other than an object', () => {
      assert.throws(() => TObject.check(null));
      assert.throws(() => TObject.check(undefined));
      assert.throws(() => TObject.check(54));
      assert.throws(() => TObject.check(true));
      assert.throws(() => TObject.check('this better not work'));
    });
  });

  describe('check(value, clazz)', () => {
    it('accepts a value of the given class', () => {
      function test(value, clazz) {
        assert.strictEqual(TObject.check(value, clazz), value);
      }

      test({ a: 10 }, Object);

      test(['x'],     Array);
      test(['x'],     Object);

      test(() => 123, Function);
      test(() => 123, Object);
    });

    it('throws an Error when passed a value not of the given class', () => {
      assert.throws(() => TObject.check(new Boolean(true), String));
    });

    it('throws an Error when passed anything other than an object', () => {
      assert.throws(() => TObject.check(null, Object));
      assert.throws(() => TObject.check(54,   Object));
    });
  });

  describe('orNull(value)', () => {
    it('returns the provided value when passed an object', () => {
      function test(value) {
        assert.strictEqual(TObject.orNull(value), value);
      }

      test({ a: 1, b: 2 });
      test([1, 2, 3]);
      test(() => 123);
      test(new Map());
    });

    it('returns `null` when passed `null`', () => {
      assert.isNull(TObject.orNull(null));
    });

    it('throws an Error when passed anything other than an object or `null`', () => {
      assert.throws(() => TObject.orNull(undefined));
      assert.throws(() => TObject.orNull(false));
      assert.throws(() => TObject.orNull(54));
      assert.throws(() => TObject.orNull('this better not work'));
    });
  });

  describe('orNull(value, clazz)', () => {
    it('returns the provided value when passed an object of a matching class', () => {
      function test(value, clazz) {
        assert.strictEqual(TObject.orNull(value, clazz), value);
      }

      test({ a: 1, b: 2 }, Object);
      test([1, 2, 3],      Array);
      test([1, 2, 3],      Object);
      test(() => 123,      Function);
      test(new Map(),      Map);
      test(new Map(),      Object);
    });

    it('returns `null` when passed a `null` value, no matter what class is passed', () => {
      assert.isNull(TObject.orNull(null, Object));
      assert.isNull(TObject.orNull(null, Set));
    });

    it('throws an Error when passed an object of a non-matching class', () => {
      assert.throws(() => TObject.orNull(new Map(), Set));
      assert.throws(() => TObject.orNull(new Set(), Map));
    });

    it('throws an Error when passed anything other than an object or `null`', () => {
      assert.throws(() => TObject.orNull(false,   Boolean));
      assert.throws(() => TObject.orNull(914,     Number));
      assert.throws(() => TObject.orNull('florp', String));
    });
  });

  // Common tests for `plain()` and `plainOrNull()`.
  function plainishTests(plainish) {
    it('accepts plain objects', () => {
      function test(value) {
        assert.strictEqual(plainish(value), value);
      }

      test({});
      test({ a: 10 });
      test({ a: 10, b: 'x' });
      test({ a: 10, b: 'x', c: new Map() });
    });

    it('rejects non-plain objects', () => {
      function test(value) {
        assert.throws(() => { plainish(value); });
      }

      test([]);
      test([1]);
      test(() => true);
      test(new Map());
      test({ get x() { return 'x'; } });
      test({ set x(v) { /*empty*/ } });
      test({ [Symbol('blort')]: [1, 2, 3] });
    });

    it('rejects non-objects (other than `null`)', () => {
      function test(value) {
        assert.throws(() => { plainish(value); });
      }

      test(undefined);
      test(false);
      test(true);
      test('x');
      test(37);
    });

    it('checks values when passed a value checker argument', () => {
      function checker(v) {
        if (typeof(v) !== 'string') {
          throw new Error('nopeNopeNope');
        }

        return v;
      }

      const good = { x: 'yes', y: 'also-yes' };
      assert.strictEqual(plainish(good, checker), good);

      for (const badOne of [123, { not: 'a-string' }, false]) {
        const bad = { x: 'blort', oops: badOne, florp: 'like' };
        assert.throws(() => plainish(bad, checker), /nopeNopeNope/);
      }
    });
  }

  describe('plain()', () => {
    plainishTests((v, c) => TObject.plain(v, c));

    it('rejects `null`', () => {
      assert.throws(() => { TObject.plain(null); });
    });
  });

  describe('plainOrNull()', () => {
    plainishTests((v, c) => TObject.plainOrNull(v, c));

    it('accepts `null`', () => {
      assert.isNull(TObject.plainOrNull(null));
    });
  });

  describe('withExactKeys()', () => {
    it('accepts an empty list of keys', () => {
      const value = {};

      assert.strictEqual(TObject.withExactKeys(value, []), value);
    });

    it('accepts an object with exactly the provided keys', () => {
      const value = { 'a': 1, 'b': 2, 'c': 3 };

      assert.strictEqual(TObject.withExactKeys(value, ['a', 'b', 'c']), value);
    });

    it('rejects an object value which is missing a key', () => {
      const value = { 'a': 1, 'b': 2 };

      assert.throws(() => TObject.withExactKeys(value, ['a', 'b', 'c']));
    });

    it('rejects an object with a superset of keys', () => {
      const value = { 'a': 1, 'b': 2, 'c': 3, 'd': 4 };

      assert.throws(() => TObject.withExactKeys(value, ['a', 'b', 'c']));
    });

    it('rejects non-plain objects', () => {
      assert.throws(() => TObject.withExactKeys(new Map(),  []));
      assert.throws(() => TObject.withExactKeys(['z'],      []));
      assert.throws(() => TObject.withExactKeys(() => true, []));
    });

    it('rejects non-objects', () => {
      assert.throws(() => TObject.withExactKeys('x',  []));
      assert.throws(() => TObject.withExactKeys(914,  []));
      assert.throws(() => TObject.withExactKeys(null, []));
    });
  });
});
