// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { Codec } from 'codec';
import { BaseDataManager, FileAccess, ValidationStatus } from 'doc-server';
import { TransactionSpec } from 'file-store';
import { MockFile } from 'file-store/mocks';

/** {FileAccess} Convenient instance of `FileAccess`. */
const FILE_ACCESS = new FileAccess(Codec.theOne, new MockFile('blort'));

describe('doc-server/BaseDataManager', () => {
  describe('.initSpec', () => {
    it('should call through to the impl', () => {
      const spec = new TransactionSpec();
      class TestDataManager extends BaseDataManager {
        get _impl_initSpec() {
          return spec;
        }
      }

      const dm = new TestDataManager(FILE_ACCESS);
      assert.strictEqual(dm.initSpec, spec);
    });

    it('should reject an improper subclass choice', () => {
      class HasBadSpec extends BaseDataManager {
        get _impl_initSpec() {
          return ['not a spec'];
        }
      }

      const dm = new HasBadSpec(FILE_ACCESS);
      assert.throws(() => dm.initSpec);
    });
  });

  describe('afterInit()', () => {
    it('should call through to the impl', async () => {
      const dm = new BaseDataManager(FILE_ACCESS);

      let callCount = 0;
      dm._impl_afterInit = async () => {
        callCount++;
        return 'return value should be ignored';
      };

      const result = await dm.afterInit();
      assert.strictEqual(callCount, 1);
      assert.isUndefined(result);
    });

    it('should throw whatever error is thrown by the impl', async () => {
      const dm = new BaseDataManager(FILE_ACCESS);
      dm._impl_afterInit = async () => {
        throw new Error('oy');
      };

      await assert.isRejected(dm.afterInit(), /^oy$/);
    });
  });

  describe('validationStatus()', () => {
    it('should call through to the impl', async () => {
      const dm = new BaseDataManager(FILE_ACCESS);

      let callCount = 0;
      dm._impl_validationStatus = async () => {
        callCount++;
        return ValidationStatus.STATUS_OK;
      };

      const result = await dm.validationStatus();
      assert.strictEqual(callCount, 1);
      assert.strictEqual(result, ValidationStatus.STATUS_OK);
    });

    it('should throw whatever error is thrown by the impl', async () => {
      const dm = new BaseDataManager(FILE_ACCESS);
      dm._impl_validationStatus = async () => {
        throw new Error('oy');
      };

      await assert.isRejected(dm.validationStatus(), /^oy$/);
    });

    it('should reject bogus impl return values', async () => {
      const dm = new BaseDataManager(FILE_ACCESS);
      dm._impl_validationStatus = async () => {
        return ['not actually a validation status'];
      };

      await assert.isRejected(dm.validationStatus(), /bad_value/);
    });
  });
});