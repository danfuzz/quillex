// Copyright 2016-2017 the Bayou Authors (Dan Bornstein et alia).
// Licensed AS IS and WITHOUT WARRANTY under the Apache License,
// Version 2.0. Details: <http://www.apache.org/licenses/LICENSE-2.0>

// This file is included by the `/edit/*` debugging endpoints. What it does is
// arrange to get called if/when the editor decides it needs to recover (e.g.
// and most likely because the developer restarted their local server). Beyond
// that, it _also_ kicks off loading of the regular bootstrap code.

// Disable Eslint, because this file is delivered as-is and has to be fairly
// conservative.
/* eslint-disable */

/**
 * This global function is what ultimately gets called to attempt recovery. In
 * this case, we rely on the `/key/*` debugging endpoints to generate a new key.
 * If that's successful, we report it back up through the layers.
 */
function BAYOU_RECOVER(key) {
  var docId = DEBUG_DOCUMENT_ID;
  var authorId = DEBUG_AUTHOR_ID;
  var url = `${new URL(key.url).origin}/debug/key/${docId}/${authorId}`;

  return new Promise((res, rej_unused) => {
    var req = new XMLHttpRequest();
    req.open('GET', url);
    req.send();
    req.addEventListener('abort', reloadPage);
    req.addEventListener('error', reloadPage);
    req.addEventListener('load', gotKey);

    // If there's any trouble, we just ask the window to reload. This will
    // almost certainly work but is definitely a last-resort hail-mary kind of
    // thing.
    function reloadPage() {
      window.location.reload(true);
    }

    // On successful request completion, check to see if we actually got good
    // data. If so, report it back. If not, fall back to `reloadPage()`.
    function gotKey() {
      if (req.status === 200) {
        res(req.response);
      } else {
        reloadPage();
      }
    }
  })
}

// We wrap everything else in an immediately-executed function so as to avoid
// polluting the global namespace.
(function () {
  // Add the standard bootstrap code to the page.
  var elem = document.createElement('script');
  elem.src = '/boot-from-key.js';
  document.head.appendChild(elem);
}());