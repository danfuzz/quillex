// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { StoragePath } from 'file-store';

/** {array<string>} List of valid paths. */
const VALID_PATHS = [
  '/a',
  '/1',
  '/_',
  '/abc123_ABC',
  '/foo/bar',
  '/foo/bar/999999',
  '/florp/blort/like/TIMELINE_GOES_SIDEWAYS'
];

/** {array<string>} List of invalid paths. */
const INVALID_PATHS = [
  // No components.
  '',
  '/',
  '//',

  // Improper slash hygiene.
  'a',
  'a/',
  'a/b',
  'a//b',
  '/a/',
  '//a/',
  '/a//',
  '/a//b',

  // Invalid characters in components.
  '/!',
  '/~',
  '/@',
  '/#',
  '/foo!',
  '/bar~',
  '/baz@',
  '/blort#',
  '/foo/!a',
  '/bar/~b',
  '/baz/@c',
  '/blort/#d'
];

/** {array<*>} List of non-strings to check as paths (or path components). */
const NON_STRINGS = [
  null,
  undefined,
  true,
  123.456,
  [],
  ['/hello'],
  {},
  { '/x': '/y' }
];

describe('file-store/StoragePath', () => {
  describe('allPrefixes()', () => {
    it('should work as expected', () => {
      function test(value, expected) {
        assert.deepEqual(StoragePath.allPrefixes(value), expected);
      }

      test('/foo', []);
      test('/foo/bar', ['/foo']);
      test('/foo/bar/baz', ['/foo', '/foo/bar']);
      test('/foo/bar/baz/blort/florp', ['/foo', '/foo/bar', '/foo/bar/baz', '/foo/bar/baz/blort']);
    });
  });

  describe('check()', () => {
    it('should accept valid paths', () => {
      for (const value of VALID_PATHS) {
        assert.strictEqual(StoragePath.check(value), value);
      }
    });

    it('should reject invalid paths', () => {
      for (const value of INVALID_PATHS) {
        assert.throws(() => { StoragePath.check(value); });
      }
    });

    it('should reject non-strings', () => {
      for (const value of NON_STRINGS) {
        assert.throws(() => { StoragePath.check(value); });
      }
    });
  });

  describe('checkComponent()', () => {
    it('should accept valid components', () => {
      function test(value) {
        assert.strictEqual(StoragePath.checkComponent(value), value);
      }

      test('a');
      test('1');
      test('_');
      test('abc123_ABC');
      test('foobar');
      test('999999');
      test('TIMELINE_GOES_SIDEWAYS');
    });

    it('should reject invalid components', () => {
      function test(value) {
        assert.throws(() => { StoragePath.checkComponent(value); });
      }

      test('');
      test('/');
      test('~');
      test('@');
      test('#');
      test('/foo');
      test('foo!');
      test('bar~');
      test('baz@');
      test('blort#');
      test('/foo/a');
      test('bar~b');
      test('baz@c');
      test('blort#d');
    });

    it('should reject non-strings', () => {
      for (const value of NON_STRINGS) {
        assert.throws(() => { StoragePath.checkComponent(value); });
      }
    });
  });

  describe('isInstance()', () => {
    it('should return `true` for valid paths', () => {
      for (const value of VALID_PATHS) {
        assert.isTrue(StoragePath.isInstance(value), value);
      }
    });

    it('should return `false` for invalid paths', () => {
      for (const value of INVALID_PATHS) {
        assert.isFalse(StoragePath.isInstance(value), value);
      }
    });

    it('should return `false` for non-strings', () => {
      for (const value of NON_STRINGS) {
        assert.isFalse(StoragePath.isInstance(value), value);
      }
    });
  });

  describe('isPrefix()', () => {
    it('should return `true` for prefix relationships', () => {
      function test(prefix, path) {
        assert.isTrue(StoragePath.isPrefix(prefix, path));
      }

      test('/a', '/a/b');
      test('/a', '/a/b/c');
      test('/a', '/a/b/c/d');
      test('/a', '/a/b/c/d/e');
      test('/a', '/a/b/c/d/e/f');
      test('/blort/florp', '/blort/florp/a');
      test('/blort/florp', '/blort/florp/aa');
      test('/blort/florp', '/blort/florp/aa/b');
      test('/blort/florp', '/blort/florp/aa/bb');
    });

    it('should return `false` for non-prefix relationships', () => {
      function test(prefix, path) {
        assert.isFalse(StoragePath.isPrefix(prefix, path));
      }

      test('/a', '/b');
      test('/a', '/b/a');
      test('/a/b', '/a');
      test('/a', '/aa');
      test('/a/b', '/a/bb');
    });
  });

  describe('join()', () => {
    it('should join as expected', () => {
      function test(value, expected) {
        assert.strictEqual(StoragePath.join(value), expected);
      }

      test(['a'], '/a');
      test(['a', 'b'], '/a/b');
      test(['blort', 'florp', 'like'], '/blort/florp/like');
    });
  });

  describe('orNull()', () => {
    it('should accept `null`', () => {
      assert.strictEqual(StoragePath.orNull(null), null);
    });

    it('should accept valid paths', () => {
      for (const value of VALID_PATHS) {
        assert.strictEqual(StoragePath.orNull(value), value);
      }
    });

    it('should reject invalid paths', () => {
      for (const value of INVALID_PATHS) {
        assert.throws(() => { StoragePath.orNull(value); });
      }
    });

    it('should reject non-null non-strings', () => {
      for (const value of NON_STRINGS) {
        if (value === null) {
          continue;
        }
        assert.throws(() => { StoragePath.orNull(value); });
      }
    });
  });

  describe('split()', () => {
    it('should split as expected', () => {
      function test(value, expected) {
        assert.deepEqual(StoragePath.split(value), expected);
      }

      test('/a', ['a']);
      test('/a/b', ['a', 'b']);
      test('/blort/florp/like', ['blort', 'florp', 'like']);
    });
  });
});
