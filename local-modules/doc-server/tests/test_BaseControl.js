// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { Codec } from 'codec';
import { Timestamp } from 'doc-common';
import { MockChange, MockOp, MockSnapshot } from 'doc-common/mocks';
import { BaseControl, FileAccess } from 'doc-server';
import { MockControl } from 'doc-server/mocks';
import { MockFile } from 'file-store/mocks';
import { Delay } from 'promise-util';

/** {FileAccess} Convenient instance of `FileAccess`. */
const FILE_ACCESS = new FileAccess(Codec.theOne, new MockFile('blort'));

describe('doc-server/BaseControl', () => {
  describe('.changeClass', () => {
    it('should reflect the subclass\'s implementation', () => {
      const result = MockControl.changeClass;
      assert.strictEqual(result, MockSnapshot.changeClass);
    });
  });

  describe('.snapshotClass', () => {
    it('should reflect the subclass\'s implementation', () => {
      const result = MockControl.snapshotClass;
      assert.strictEqual(result, MockSnapshot);
    });

    it('should reject an improper subclass choice', () => {
      class HasBadSnapshot extends BaseControl {
        static get _impl_snapshotClass() {
          return Object;
        }
      }

      assert.throws(() => HasBadSnapshot.snapshotClass);
    });

    it('should only ever ask the subclass once', () => {
      class GoodControl extends BaseControl {
        static get _impl_snapshotClass() {
          this.count++;
          return MockSnapshot;
        }
      }

      GoodControl.count = 0;
      assert.strictEqual(GoodControl.snapshotClass, MockSnapshot);
      assert.strictEqual(GoodControl.snapshotClass, MockSnapshot);
      assert.strictEqual(GoodControl.snapshotClass, MockSnapshot);
      assert.strictEqual(GoodControl.snapshotClass, MockSnapshot);
      assert.strictEqual(GoodControl.snapshotClass, MockSnapshot);

      assert.strictEqual(GoodControl.count, 1);
    });
  });

  describe('constructor()', () => {
    it('should accept a `FileAccess` and reflect it in the inherited getters', () => {
      const fa     = FILE_ACCESS;
      const result = new MockControl(fa);

      assert.strictEqual(result.codec,         fa.codec);
      assert.strictEqual(result.file,          fa.file);
      assert.strictEqual(result.fileAccess,    fa);
      assert.strictEqual(result.fileCodec,     fa.fileCodec);
      assert.strictEqual(result.log,           fa.log);
      assert.strictEqual(result.schemaVersion, fa.schemaVersion);
    });

    it('should reject non-`FileAccess` arguments', () => {
      assert.throws(() => new MockControl(null));
      assert.throws(() => new MockControl({ x: 10 }));
    });
  });

  describe('currentRevNum()', () => {
    it('should call through to the subclass implementation', async () => {
      const control = new MockControl(FILE_ACCESS);

      control._impl_currentRevNum = async () => {
        return 123;
      };
      await assert.eventually.strictEqual(control.currentRevNum(), 123);

      control._impl_currentRevNum = async () => {
        await Delay.resolve(50);
        return 321;
      };
      await assert.eventually.strictEqual(control.currentRevNum(), 321);

      const error = new Error('Oy!');
      control._impl_currentRevNum = async () => {
        throw error;
      };
      await assert.isRejected(control.currentRevNum(), /^Oy!$/);
    });

    it('should reject improper subclass return values', async () => {
      const control = new MockControl(FILE_ACCESS);

      async function test(value) {
        control._impl_currentRevNum = async () => {
          return value;
        };

        await assert.isRejected(control.currentRevNum(), /^bad_value/);
      }

      await test(null);
      await test(undefined);
      await test(-1);
      await test(0.05);
      await test('blort');
      await test([10]);
    });
  });

  describe('getChangeAfter()', () => {
    it('should call through to `_impl_currentRevNum()` before anything else', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        throw new Error('Oy!');
      };
      control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum_unused) => {
        throw new Error('This should not have been called.');
      };

      await assert.isRejected(control.getChangeAfter(0), /^Oy!/);
    });

    it('should check the validity of `baseRevNum` against the response from `_impl_currentRevNum()`', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };
      control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum_unused) => {
        throw new Error('This should not have been called.');
      };

      await assert.isRejected(control.getChangeAfter(11), /^bad_value/);
    });

    it('should reject blatantly invalid `baseRevNum` values', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };
      control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum_unused) => {
        throw new Error('This should not have been called.');
      };

      async function test(value) {
        await assert.isRejected(control.getChangeAfter(value), /^bad_value/);
      }

      await test(null);
      await test(undefined);
      await test(-1);
      await test(0.05);
      await test('blort');
      await test([10]);
    });

    it('should return back a valid non-`null` subclass response', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };
      control._impl_getChangeAfter = async (baseRevNum, currentRevNum) => {
        const rev = currentRevNum + 1;
        return new MockChange(rev, [new MockOp('x', baseRevNum, rev)]);
      };

      const result = await control.getChangeAfter(5);
      assert.instanceOf(result, MockChange);
      assert.strictEqual(result.revNum, 11);
      assert.deepEqual(result.delta.ops, [new MockOp('x', 5, 11)]);
    });

    it('should convert a `null` subclass response to a `revision_not_available` error', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };
      control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum_unused) => {
        return null;
      };

      await assert.isRejected(control.getChangeAfter(1), /^revision_not_available/);
    });

    it('should reject a non-change subclass response', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };

      async function test(value) {
        control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum_unused) => {
          return value;
        };

        await assert.isRejected(control.getChangeAfter(1), /^bad_value/);
      }

      await test(-1);
      await test(0.05);
      await test('blort');
      await test([10]);
    });

    it('should reject a change response that has a `timestamp`', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };
      control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum) => {
        return new MockChange(currentRevNum + 1, [], Timestamp.MIN_VALUE);
      };

      await assert.isRejected(control.getChangeAfter(1), /^bad_value/);
    });

    it('should reject a change response that has an `authorId`', async () => {
      const control = new MockControl(FILE_ACCESS);
      control._impl_currentRevNum = async () => {
        return 10;
      };
      control._impl_getChangeAfter = async (baseRevNum_unused, currentRevNum) => {
        return new MockChange(currentRevNum + 1, [], null, 'some_author');
      };

      await assert.isRejected(control.getChangeAfter(1), /^bad_value/);
    });
  });
});
