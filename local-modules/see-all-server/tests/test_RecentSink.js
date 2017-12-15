// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { assert } from 'chai';
import { describe, it } from 'mocha';

import { LogRecord } from 'see-all';
import { RecentSink } from 'see-all-server';

describe('see-all-server/RecentSink', () => {
  describe('log()', () => {
    it('should log the item as given', () => {
      const sink = new RecentSink(1);

      sink.log(new LogRecord(90909, 'yay-stack', 'error', 'foo', 'bar', 'baz'));

      const contents = sink.contents;
      assert.lengthOf(contents, 1);
      assert.deepEqual(contents[0],
        new LogRecord(90909, 'yay-stack', 'error', 'foo', 'bar baz'));
    });
  });

  describe('time()', () => {
    it('should log the time as given', () => {
      const sink = new RecentSink(1);

      sink.time(80808, 'utc-time', 'local-time');

      const contents = sink.contents;
      assert.lengthOf(contents, 1);
      assert.deepEqual(contents[0],
        new LogRecord(80808, null, 'info', 'time', 'utc-time', 'local-time'));
    });
  });

  describe('.contents', () => {
    it('should contain all logged items assuming no `time` has been logged', () => {
      const sink = new RecentSink(1);
      const NUM_LINES = 10;

      for (let i = 0; i < NUM_LINES; i++) {
        sink.log(new LogRecord(12345 + i, 'yay-stack', 'info', 'blort', 'florp', i));
      }

      const contents = sink.contents;

      for (let i = 0; i < NUM_LINES; i++) {
        const lr = contents[i];

        assert.strictEqual(lr.timeMsec, 12345 + i);
        assert.strictEqual(lr.stack, 'yay-stack');
        assert.strictEqual(lr.level, 'info');
        assert.strictEqual(lr.tag, 'blort');
        assert.deepEqual(lr.message, [`florp ${i}`]);
      }
    });

    it('should only contain new-enough items if `time` was just logged', () => {
      function timeForLine(line) {
        return 12345 + (line * 100);
      }

      const NUM_LINES = 1000;
      const MAX_AGE = 2000;
      const FINAL_TIME = timeForLine(NUM_LINES);
      const sink = new RecentSink(MAX_AGE);

      for (let i = 0; i < NUM_LINES; i++) {
        sink.log(new LogRecord(timeForLine(i), 'yay-stack', 'info', 'blort', 'florp'));
      }

      sink.time(FINAL_TIME, 'utc', 'local');

      const contents = sink.contents;

      for (const lr of contents) {
        if (lr.tag === 'time') {
          assert.strictEqual(lr.timeMsec, FINAL_TIME);
          assert.strictEqual(lr.message[0], 'utc');
          assert.strictEqual(lr.message[1], 'local');
        } else {
          assert.isAtLeast(lr.timeMsec, FINAL_TIME - MAX_AGE);
        }
      }
    });
  });

  describe('.htmlContents', () => {
    it('should return the logged lines as HTML', () => {
      const sink = new RecentSink(1);
      const NUM_LINES = 10;

      for (let i = 0; i < NUM_LINES; i++) {
        sink.log(new LogRecord(12345 + i, 'yay-stack', 'info', 'blort', 'florp', i));
      }

      const contents = sink.htmlContents;
      const lines    = contents.match(/[^\r\n]+/g);

      // Count the lines starting with `<tr>`. This is kind of a weak test but
      // it's better than nothing.

      let count = 0;
      for (const l of lines) {
        if (/^<tr>/.test(l)) {
          count++;
        }
      }

      assert.strictEqual(count, NUM_LINES);
    });
  });
});
