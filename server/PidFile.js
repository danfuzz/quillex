// Copyright 2016 the Quillex Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import fs from 'fs';
import path from 'path';

import SeeAll from 'see-all';

/** Logger. */
const log = new SeeAll('pid');

/** Base dir of the product. */
const baseDir = path.resolve(__dirname, '..');

/** Path for the PID file. */
const pidPath = path.resolve(baseDir, 'pid.txt');

/**
 * This writes a PID file when the module is `init`ed, and tries to remove it
 * when the app is shutting down. This clas is _not_ meant to be instantiated.
 */
export default class PidFile {
  /**
   * Write the PID file, and arrange for its timely erasure.
   */
  static init() {
    // Erase the file on exit.
    process.once('exit',    PidFile._erasePid);
    process.once('SIGINT',  PidFile._handleSignal.bind(null, 'SIGINT'));
    process.once('SIGTERM', PidFile._handleSignal.bind(null, 'SIGTERM'));

    // Write the PID file.
    fs.writeFileSync(pidPath, `${process.pid}\n`);

    log.info(`PID: ${process.pid}`);
  }

  /**
   * Handles a signal by erasing the PID file (if it exists) and then
   * re-raising the same signal.
   *
   * @param id Signal ID.
   */
  static _handleSignal(id) {
    log.info(`Received signal: ${id}`);
    PidFile._erasePid();
    process.kill(process.pid, id)
  }

  /**
   * Erases the PID file if it exists.
   */
  static _erasePid() {
    try {
      fs.unlinkSync(pidPath);
      log.info(`Removed PID file.`);
    } catch (e) {
      // Ignore errors. We're about to exit anyway.
    }
  }
}