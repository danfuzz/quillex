// Copyright 2016-2018 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import afs from 'async-file';
import path from 'path';

import { Codec } from 'codec';
import { Dirs } from 'env-server';
import { BaseFileStore } from 'file-store';
import { TheModule as fileStoreOt_TheModule } from 'file-store-ot';
import { Logger } from 'see-all';

import LocalFile from './LocalFile';

/** {Logger} Logger for this module. */
const log = new Logger('local-file');

/**
 * File storage implementation that stores everything in the locally-accessible
 * filesystem.
 */
export default class LocalFileStore extends BaseFileStore {
  /**
   * Constructs an instance. This is not meant to be used publicly.
   */
  constructor() {
    super();

    /** {Codec} Codec to use when reading and writing file OT objects. */
    this._codec = new Codec();
    fileStoreOt_TheModule.registerCodecs(this._codec.registry);

    /** {Map<string, LocalFile>} Map from file IDs to file instances. */
    this._files = new Map();

    /** {string} The directory for file storage. */
    this._dir = path.resolve(Dirs.theOne.VAR_DIR, 'files');

    /**
     * {boolean} `true` iff the file storage directory is known to exist. Set
     * to `true` in `_ensureFileStorageDirectory()`.
     */
    this._ensuredDir = false;

    log.info('File storage directory:', this._dir);
  }

  /**
   * Implementation as required by the superclass.
   *
   * @param {string} fileId The ID of the file to access.
   * @returns {BaseFile} Accessor for the file in question.
   */
  async _impl_getFile(fileId) {
    const already = this._files.get(fileId);

    if (already) {
      return already;
    }

    await this._ensureFileStorageDirectory();

    const result = new LocalFile(fileId, this._filePath(fileId), this._codec);
    this._files.set(fileId, result);
    return result;
  }

  /**
   * Gets the filesystem path for the file with the given ID.
   *
   * @param {string} fileId The file ID.
   * @returns {string} The corresponding filesystem path.
   */
  _filePath(fileId) {
    // The URI encoding helps keep this code resilient with respect to possible
    // variance in the allowed syntax for `fileId`s.
    return path.resolve(this._dir, encodeURIComponent(fileId));
  }

  /**
   * Ensures the file storage directory exists. This will only ever check once
   * (on first file construction attempt), which notably means that things will
   * break if something removes the file storage directory without restarting
   * the server.
   */
  async _ensureFileStorageDirectory() {
    if (this._ensuredDir) {
      return;
    }

    if (await afs.exists(this._dir)) {
      log.detail('File storage directory already exists.');
    } else {
      await afs.mkdir(this._dir);
      log.info('Created file storage directory.');
    }

    this._ensuredDir = true;
  }
}
