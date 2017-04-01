// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { SeeAll } from 'see-all';
import { CommonBase } from 'util-common';

const logger = new SeeAll('test-common-base');

class NearlyEmptyClass {
  fiat() {
    logger.debug('I exist');
  }
}

class CommonBaseSubclass extends CommonBase {
  fiat() {
    logger.debug('I exist too!');
  }
}

describe('util-common.CommonBase', () => {
  describe('#mixInto(class)', () => {
    it('should add its properties to the supplied class', () => {
      assert.notProperty(NearlyEmptyClass, 'coerce');

      CommonBase.mixInto(NearlyEmptyClass);

      assert.property(NearlyEmptyClass, 'coerce');
    });
  });

  describe('#check(object)', () => {
    it('should return the supplied value if it is an instance or subclass of CommonBase', () => {
      const base = new CommonBase();
      const subclass = new CommonBaseSubclass();

      assert.equal(CommonBase.check(base), base);
      assert.equal(CommonBaseSubclass.check(subclass), subclass);
    });

    it('should throw an Error if the supplied value is not a child instance', () => {
      const somethingElse = new NearlyEmptyClass();

      assert.throws(() => CommonBase.check(somethingElse));
    });
  });

  /* TODO: Not sure how to test the coerce functions. Need help there. */
});