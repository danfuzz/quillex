// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { FileOp, TransactionSpec } from 'file-store';
import { LocalFile } from 'file-store-local';
import { FrozenBuffer } from 'util-common';

import TempFiles from './TempFiles';

describe('file-store-local/LocalFile.transact', () => {
  it('should throw an error if the file doesn\'t exist', async () => {
    const file = new LocalFile('0', TempFiles.uniquePath());
    assert.isFalse(await file.exists()); // Baseline assumption.

    // The actual test.
    const spec = new TransactionSpec();
    await assert.isRejected(file.transact(spec));
  });

  it('should succeed and return no data from an empty transaction on an existing file', async () => {
    const file = new LocalFile('0', TempFiles.uniquePath());
    await file.create();

    const spec = new TransactionSpec();
    const result = await file.transact(spec);
    assert.strictEqual(result.revNum, 0);
    assert.isUndefined(result.newRevNum);
    assert.isUndefined(result.data);
  });

  describe('op listPath', () => {
    it('should return an empty set when no results are found', async () => {
      const file = new LocalFile('0', TempFiles.uniquePath());
      await file.create();

      const spec = new TransactionSpec(FileOp.op_listPath('/blort'));
      const result = await file.transact(spec);
      assert.instanceOf(result.paths, Set);
      assert.strictEqual(result.paths.size, 0);
    });

    it('should return a single result immediately under the path', async () => {
      const file = new LocalFile('0', TempFiles.uniquePath());
      await file.create();

      let spec = new TransactionSpec(
        FileOp.op_writePath('/blort/yep', new FrozenBuffer('yep')),
        FileOp.op_writePath('/nope', new FrozenBuffer('nope'))
      );
      await file.transact(spec);

      spec = new TransactionSpec(FileOp.op_listPath('/blort'));
      const result = await file.transact(spec);
      const paths = result.paths;

      assert.instanceOf(paths, Set);
      assert.strictEqual(paths.size, 1);
      assert.isTrue(paths.has('/blort/yep'));
    });

    it('should return a single result immediately under the path, even if the full result path has more components', async () => {
      const file = new LocalFile('0', TempFiles.uniquePath());
      await file.create();

      let spec = new TransactionSpec(
        FileOp.op_writePath('/blort/yep/nope', new FrozenBuffer('yep')),
        FileOp.op_writePath('/nope', new FrozenBuffer('nope'))
      );
      await file.transact(spec);

      spec = new TransactionSpec(FileOp.op_listPath('/blort'));
      const result = await file.transact(spec);
      const paths = result.paths;

      assert.instanceOf(paths, Set);
      assert.strictEqual(paths.size, 1);
      assert.isTrue(paths.has('/blort/yep'));
    });

    it('should return multiple results properly', async () => {
      const file = new LocalFile('0', TempFiles.uniquePath());
      await file.create();

      let spec = new TransactionSpec(
        FileOp.op_writePath('/abraxas/1/2/3', new FrozenBuffer('nope')),
        FileOp.op_writePath('/blort/nope', new FrozenBuffer('nope')),
        FileOp.op_writePath('/blort/x/affirmed', new FrozenBuffer('yep')),
        FileOp.op_writePath('/blort/x/definitely/a/b/c', new FrozenBuffer('yep')),
        FileOp.op_writePath('/blort/x/definitely/d/e/f', new FrozenBuffer('yep')),
        FileOp.op_writePath('/blort/x/yep/1', new FrozenBuffer('yep')),
        FileOp.op_writePath('/blort/x/yep/2', new FrozenBuffer('yep')),
        FileOp.op_writePath('/blort/x/yep/3', new FrozenBuffer('yep')),
        FileOp.op_writePath('/nope', new FrozenBuffer('nope')),
        FileOp.op_writePath('/nope/blort', new FrozenBuffer('nope'))
      );
      await file.transact(spec);

      spec = new TransactionSpec(FileOp.op_listPath('/blort/x'));
      const result = await file.transact(spec);
      const paths = result.paths;

      assert.instanceOf(paths, Set);
      assert.strictEqual(paths.size, 3);
      assert.isTrue(paths.has('/blort/x/yep'));
      assert.isTrue(paths.has('/blort/x/affirmed'));
      assert.isTrue(paths.has('/blort/x/definitely'));
    });
  });
});
