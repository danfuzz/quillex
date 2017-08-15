// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { FrozenBuffer } from 'util-common';

/**
 * {array<string>} List of string test cases meant to cover a good swath of test
 * territory.
 */
const STRING_CASES = [
  '',
  'florp',
  '\u0001',
  'I 😍 U.',
  'á',
  '⣿',
  '😀'
];

describe('util-common/FrozenBuffer', () => {
  describe('checkHash()', () => {
    it('should accept valid hash strings', () => {
      function test(string) {
        assert.strictEqual(FrozenBuffer.checkHash(string), string);
      }

      test('=sha3_0_0000000011111111222222223333333300000000111111112222222233333333');
      test('=sha3_1_0000000011111111222222223333333300000000111111112222222233333333');
      test('=sha3_9abcdef_0000000011111111222222223333333300000000111111112222222233333333');
      test('=sha3_123abc_00000000123456782222222233333333000000001111111122222222abcdef99');
    });

    it('should reject invalid hash strings', () => {
      assert.throws(() => FrozenBuffer.checkHash(''));
      assert.throws(() => FrozenBuffer.checkHash('1234'));
      assert.throws(() => FrozenBuffer.checkHash('sha3_1234'));
      assert.throws(() => FrozenBuffer.checkHash('sha3_1234_0000000011111111222222223333333300000000111111112222222233333333'));

      // Wrong algorithm.
      assert.throws(() => FrozenBuffer.checkHash('=blort_1234_0000000011111111222222223333333300000000111111112222222233333333'));

      // Length too long.
      assert.throws(() => FrozenBuffer.checkHash('=sha3_123456789_0000000011111111222222223333333300000000111111112222222233333333'));

      // Zero-prefixed length.
      assert.throws(() => FrozenBuffer.checkHash('=sha3_01_0000000011111111222222223333333300000000111111112222222233333333'));
    });

    it('should reject non-strings', () => {
      assert.throws(() => FrozenBuffer.checkHash(undefined));
      assert.throws(() => FrozenBuffer.checkHash(null));
      assert.throws(() => FrozenBuffer.checkHash(true));
      assert.throws(() => FrozenBuffer.checkHash(123.456));
      assert.throws(() => FrozenBuffer.checkHash(['yo']));
    });
  });

  describe('constructor()', () => {
    it('should throw an error if handed anything other than a string or Buffer', () => {
      assert.throws(() => new FrozenBuffer(1));
      assert.throws(() => new FrozenBuffer(true));
      assert.throws(() => new FrozenBuffer(null));
      assert.throws(() => new FrozenBuffer(['hello']));
      assert.throws(() => new FrozenBuffer({ a: 10 }));
    });

    it('should accept strings', () => {
      assert.doesNotThrow(() => new FrozenBuffer(''));
      assert.doesNotThrow(() => new FrozenBuffer('hello'));
    });

    it('should accept Buffers', () => {
      assert.doesNotThrow(() => new FrozenBuffer(Buffer.from('')));
      assert.doesNotThrow(() => new FrozenBuffer(Buffer.alloc(100, 123)));
    });

    it('should convert strings to bytes using UTF-8 encoding', () => {
      function test(string) {
        const buf = new FrozenBuffer(string);
        const nodeBuf = Buffer.from(string, 'utf8');
        assert.deepEqual(buf.toBuffer(), nodeBuf);
      }

      for (const s of STRING_CASES) {
        test(s);
      }
    });

    it('should convert bytes to strings using UTF-8 encoding', () => {
      function test(string) {
        const nodeBuf = Buffer.from(string, 'utf8');
        const buf = new FrozenBuffer(nodeBuf);
        assert.strictEqual(buf.string, string);
      }

      for (const s of STRING_CASES) {
        test(s);
      }
    });
  });

  describe('.hashLength', () => {
    it('should be `256`', () => {
      assert.strictEqual(new FrozenBuffer('x').hashLength, 256);
    });
  });

  describe('.hashName', () => {
    it('should be `sha3`', () => {
      assert.strictEqual(new FrozenBuffer('x').hashName, 'sha3');
    });
  });

  describe('.hash', () => {
    it('should be a 256 SHA-3 with length, in the prescribed format', () => {
      // **Note:** You can validate this result via the commandline `openssl`
      // tool: `printf '<data>' | openssl dgst -sha256`
      const data = 'This is the most important data you have ever observed.';
      const expected = '=sha3_37_' +
        '0a0dd2a860af2422778911afa63c1cae54d425db402d73415cc7060d99179f3a';
      const buf = new FrozenBuffer(data);

      assert.strictEqual(buf.hash, expected);
    });
  });

  describe('.length', () => {
    it('should be the expected length from a Buffer', () => {
      const buf = new FrozenBuffer(Buffer.alloc(9000));
      assert.strictEqual(buf.length, 9000);
    });

    it('should be the expected length from a string', () => {
      assert.strictEqual(new FrozenBuffer('12345').length, 5);

      // Because of UTF-8 encoding.
      assert.strictEqual(new FrozenBuffer('á').length, 2);
      assert.strictEqual(new FrozenBuffer('⣿').length, 3);
      assert.strictEqual(new FrozenBuffer('😀').length, 4);
    });
  });

  describe('.string', () => {
    it('should be the same string given in the constructor', () => {
      function test(string) {
        const buf = new FrozenBuffer(string);
        assert.strictEqual(buf.string, string);
      }

      for (const s of STRING_CASES) {
        test(s);
      }
    });

    it('should be the UTF-8 decoding of the Buffer given in the constructor', () => {
      function test(string) {
        const nodeBuf = Buffer.from(string, 'utf8');
        const buf = new FrozenBuffer(nodeBuf);
        assert.strictEqual(buf.string, string);
      }

      for (const s of STRING_CASES) {
        test(s);
      }
    });
  });

  describe('copy()', () => {
    it('should default to copying all data', () => {
      const buf = new FrozenBuffer('12345');
      const nodeBuf = Buffer.alloc(5);

      buf.copy(nodeBuf);
      assert.deepEqual(nodeBuf, buf.toBuffer());
    });

    it('should let the target start index be specified', () => {
      const buf = new FrozenBuffer('12345');
      const nodeBuf = Buffer.alloc(5);

      nodeBuf[0] = 0x78;
      buf.copy(nodeBuf, 1);
      assert.strictEqual(nodeBuf.toString('utf8'), 'x1234');
    });

    it('should let the target and source start indexes be specified', () => {
      const buf = new FrozenBuffer('12345');
      const nodeBuf = Buffer.alloc(5);

      nodeBuf[0] = 0x78;
      nodeBuf[4] = 0x78;
      buf.copy(nodeBuf, 1, 2);
      assert.strictEqual(nodeBuf.toString('utf8'), 'x345x');
    });

    it('should let the target, source start, and source end indexes be specified', () => {
      const buf = new FrozenBuffer('12345');
      const nodeBuf = Buffer.alloc(5);

      nodeBuf[0] = 0x78;
      nodeBuf[1] = 0x78;
      nodeBuf[4] = 0x78;
      buf.copy(nodeBuf, 2, 1, 3);
      assert.strictEqual(nodeBuf.toString('utf8'), 'xx23x');
    });
  });

  describe('equals()', () => {
    it('should consider identically-constructed instances to be equal', () => {
      function test(string) {
        const buf1 = new FrozenBuffer(string);
        const buf2 = new FrozenBuffer(string);
        assert.isTrue(buf1.equals(buf2));

        const buf3 = new FrozenBuffer(buf1.toBuffer());
        const buf4 = new FrozenBuffer(buf2.toBuffer());
        assert.isTrue(buf3.equals(buf4));

        assert.isTrue(buf1.equals(buf3));
      }

      for (const s of STRING_CASES) {
        test(s);
      }
    });

    it('should consider differently-constructed instances to be inequal', () => {
      assert.isFalse(new FrozenBuffer('').equals(new FrozenBuffer('x')));
      assert.isFalse(new FrozenBuffer('a').equals(new FrozenBuffer('b')));
      assert.isFalse(new FrozenBuffer('aa').equals(new FrozenBuffer('ab')));
    });
  });

  describe('toBuffer()', () => {
    it('should be a buffer with the same contents as given in the constructor', () => {
      const nodeBuf = Buffer.alloc(9000);

      for (let i = 0; i < nodeBuf.length; i++) {
        nodeBuf[i] = i & 0xff;
      }

      const buf = new FrozenBuffer(nodeBuf);
      const result = buf.toBuffer();

      assert.notStrictEqual(result, nodeBuf);
      assert.deepEqual(result, nodeBuf);
    });

    it('should be the UTF-8 encoding of the string given in the constructor', () => {
      function test(string) {
        const buf = new FrozenBuffer(string);
        const nodeBuf = Buffer.from(string, 'utf8');
        assert.deepEqual(buf.toBuffer(), nodeBuf);
      }

      for (const s of STRING_CASES) {
        test(s);
      }
    });
  });

});