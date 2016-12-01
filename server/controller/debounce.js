//call fn at most count times per delay
//delay in microseconds
const Promise = require('bluebird');

const promiseDebounce = function (fn, delay, count) {
  let working = 0;
  let queue = [];
  const work = () => {
    if ((queue.length === 0) || (working === count)) return;
    working++;
    Promise.delay(delay).tap(function () { working--; }).then(work);
    let next = queue.shift();
    next[2](fn.apply(next[0], next[1]));
  }
  return function debounced() {
    let args = arguments;
    return new Promise(function(resolve) {
      queue.push([this, args, resolve]);
      if (working < count) work();
    }.bind(this));
  };
};

module.exports = {
  promiseDebounce
};