// Web Worker: generates puzzles off the main thread so the page stays responsive.
// In:  { type: 'build', id, jobs: [{ index, letter, W, H, difficulty, reverse, seed, variant }] }
//      { type: 'example', id, seed }
// Out: { type: 'puzzle', id, index, puzzle } per job, then { type: 'done', id }
//      { type: 'error', id, index, message } if a job fails
// The worker's own ?v= query is passed on so updated engine files are never served from cache.
const v = self.location.search;
importScripts('glyphs.js' + v, 'slither.js' + v, 'generator.js' + v);

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'build') {
    for (const job of msg.jobs) {
      try {
        const puzzle = self.Generator.generate(job);
        self.postMessage({ type: 'puzzle', id: msg.id, index: job.index, puzzle });
      } catch (err) {
        self.postMessage({ type: 'error', id: msg.id, index: job.index, message: err.message });
      }
    }
    self.postMessage({ type: 'done', id: msg.id });
  } else if (msg.type === 'example') {
    try {
      self.postMessage({ type: 'example', id: msg.id, example: self.Generator.example(msg.seed) });
    } catch (err) {
      self.postMessage({ type: 'error', id: msg.id, message: err.message });
    }
  }
};
