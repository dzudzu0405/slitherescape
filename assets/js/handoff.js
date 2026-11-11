// Hands a freshly built game PDF from the editor to Marketing Studio without a download and re-upload.
// The PDF waits in this browser's IndexedDB for one page load, then is removed.
'use strict';
(function (root) {
  const DB = 'slitherescape-handoff', STORE = 'files', KEY = 'listing-pdf';

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function run(mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(out && out.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    }));
  }

  // { pdf: ArrayBuffer, name, themeId }
  function put(item) {
    return run('readwrite', (s) => s.put({ ...item, at: Date.now() }, KEY));
  }

  // Returns the waiting item (at most 10 minutes old) and removes it, or null.
  async function take() {
    try {
      const item = await run('readonly', (s) => s.get(KEY));
      await run('readwrite', (s) => s.delete(KEY));
      return item && Date.now() - item.at < 10 * 60 * 1000 ? item : null;
    } catch (e) {
      return null;
    }
  }

  root.Handoff = { put, take };
})(window);
