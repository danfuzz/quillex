// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

import { RevisionNumber } from 'doc-common';
import { StoragePath } from 'file-store';
import { TString } from 'typecheck';
import { UtilityClass } from 'util-common';

/**
 * Utility class that just provides the common `StoragePath` strings used
 * by the document storage format.
 */
export default class Paths extends UtilityClass {
  /** {string} `StoragePath` string for the caret information path prefix. */
  static get CARET_PREFIX() {
    return '/caret';
  }

  /** {string} `StoragePath` string for the document change path prefix. */
  static get CHANGE_PREFIX() {
    return '/change';
  }

  /**
   * {string} `StoragePath` string for the document content revision number.
   * This corresponds to the highest change number.
   */
  static get CHANGE_REVISION_NUMBER() {
    return `${Paths.CHANGE_PREFIX}/revision_number`;
  }

  /** {string} `StoragePath` string for the file format (schema) version. */
  static get FORMAT_VERSION() {
    return '/format_version';
  }

  /**
   * Gets the `StoragePath` string corresponding to the indicated revision
   * number, specifically to store the document change that results in that
   * revision.
   *
   * @param {RevisionNumber} revNum The revision number.
   * @returns {string} The corresponding `StoragePath` string for document
   *   change storage.
   */
  static forDocumentChange(revNum) {
    RevisionNumber.check(revNum);
    return `${Paths.CHANGE_PREFIX}/${revNum}`;
  }

  /**
   * Gets the `StoragePath` string corresponding to the indicated session,
   * specifically to store caret data for that session.
   *
   * @param {string} sessionId The session ID.
   * @returns {string} The corresponding `StoragePath` string for caret
   *   information.
   */
  static forCaret(sessionId) {
    TString.check(sessionId);
    return `${Paths.CARET_PREFIX}/${sessionId}`;
  }

  /**
   * Takes a full storage path for a caret and returns the session ID part of
   * it. This is the reverse of `forCaret()`.
   *
   * @param {string} path The full storage path.
   * @returns {string} The corresponding caret session ID.
   */
  static sessionFromCaretPath(path) {
    if (!StoragePath.isPrefix(Paths.CARET_PREFIX, path)) {
      throw new Error(`Not a caret path: ${path}`);
    }

    const split = StoragePath.split(path);
    return split[1];
  }
}
