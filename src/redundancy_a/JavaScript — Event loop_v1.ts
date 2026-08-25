// JavaScript — Event loop
console.log('Start');
setTimeout(() => console.log('Macro task'), 0);
Promise.resolve().then(() => console.log('Micro task'));
console.log('End');
