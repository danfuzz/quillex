// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { TString } from 'typecheck';
import { CommonBase } from 'util-common';

import FileOp from './FileOp';

/**
 * Transaction specification. This is a set of operations (each an instance of
 * `FileOp`) which are to be executed with regard to a file, as an atomic unit.
 * See `FileOp` for more information about the possible operations and how they
 * get executed.
 */
export default class TransactionSpec extends CommonBase {
  /**
   * Constructs an instance consisting of all of the indicated operations.
   *
   * @param {...FileOp} ops The operations to perform.
   */
  constructor(...ops) {
    super();

    /** {array<FileOp>} Category-sorted array of operations. */
    this._ops = FileOp.sortByCategory(ops);

    // Validate the op combo restrictions.

    if (this.opsWithName('timeout').length > 1) {
      throw new Error('Too many `timeout` operations.');
    }

    if (this.opsWithName('revNum').length > 1) {
      throw new Error('Too many `revNum` operations.');
    }

    const waitCount = this.opsWithCategory(FileOp.CAT_WAIT);
    if (waitCount === 1) {
      if (this.hasReadOps() || this.hasModificationOps()) {
        throw new Error('Cannot mix wait operations with reads and modifications.');
      }
    } else if (waitCount > 1) {
      throw new Error('Too many wait operations.');
    }
  }

  /**
   * {Iterator<FileOp>} An iterator for the operations to perform. The
   * operations are yielded by the iterator in category-sorted order, as
   * documented by `FileOp`.
   *
   * **Note:** This is an iterator and not (say) an array so as to make it
   * obvious that the contents are immutable.
   */
  get ops() {
    return this._ops.values();
  }

  /**
   * {Int|'never'} The timeout duration in milliseconds, or the string `'never'`
   * if this transaction specifies no timeout.
   */
  get timeoutMsec() {
    const result = this.opsWithName('timeout')[0];
    return (result === undefined) ? 'never' : result.arg('durMsec');
  }

  /**
   * Indicates whether or not this instance has any path list operations, that
   * is, any operations with category `CAT_LIST`.
   *
   * @returns {boolean} `true` iff there are any path list operations in this
   *   instance.
   */
  hasListOps() {
    return this.opsWithCategory(FileOp.CAT_LIST).length !== 0;
  }

  /**
   * Indicates whether or not this instance has any modification operations,
   * that is, any operations with category `CAT_DELETE` or `CAT_WRITE`.
   *
   * @returns {boolean} `true` iff there are any modification operations in this
   *   instance.
   */
  hasModificationOps() {
    return (this.opsWithCategory(FileOp.CAT_DELETE).length !== 0)
      || (this.opsWithCategory(FileOp.CAT_WRITE).length !== 0);
  }

  /**
   * Indicates whether or not this instance has any read operations, that is,
   * any operations with category `CAT_READ`.
   *
   * @returns {boolean} `true` iff there are any read operations in this
   *   instance.
   */
  hasReadOps() {
    return this.opsWithCategory(FileOp.CAT_READ).length !== 0;
  }

  /**
   * Indicates whether or not this instance has any wait operations, that is,
   * any operations with category `CAT_WAIT`.
   *
   * @returns {boolean} `true` iff there are any wait operations in this
   *   instance.
   */
  hasWaitOps() {
    return this.opsWithCategory(FileOp.CAT_WAIT).length !== 0;
  }

  /**
   * Gets all of the operations with the given category.
   *
   * @param {string} category Category of the operations.
   * @returns {array<FileOp>} Array of all such operations.
   */
  opsWithCategory(category) {
    FileOp.validateCategory(category);
    return this._ops.filter(op => (op.category === category));
  }

  /**
   * Gets all of the operations with the given Name.
   *
   * @param {string} name Name of the operations.
   * @returns {array<FileOp>} Array of all such operations.
   */
  opsWithName(name) {
    TString.nonempty(name);
    return this._ops.filter(op => (op.name === name));
  }
}
