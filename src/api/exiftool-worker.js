// exiftool-js Web Worker: runs the API off the main thread (see ExifTool.createWorker)
import { ExifTool } from './exiftool.js';

let et = null;
self.onmessage = async (e) => {
  const { id, method, args } = e.data;
  try {
    if (method === 'create') {
      et = await ExifTool.create(args[0] || {});
      self.postMessage({ id, result: { version: et.version } });
      return;
    }
    if (!et) et = await ExifTool.create();
    if (!['read', 'write', 'listTags'].includes(method)) throw new Error('unknown method ' + method);
    const result = await et[method](...args);
    // transfer binary results instead of copying them
    const transfer = [];
    if (result && result.data instanceof Uint8Array) transfer.push(result.data.buffer);
    self.postMessage({ id, result }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
