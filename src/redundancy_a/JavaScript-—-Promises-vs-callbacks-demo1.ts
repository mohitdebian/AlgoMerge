// JavaScript — Promises vs callbacks
// Callback
function doWorkCb(cb: any) { cb(null, 'done'); }
// Promise
function doWorkPromise() { return Promise.resolve('done'); }
