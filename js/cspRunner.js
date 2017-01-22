CLOSED = null;

function channel() {
  let closed = false;

  const takers = [];
  const putters = [];

  return {
    put(value, callback = () => {}) {
      if (closed) return callback(false);

      if (takers.length) {
        const {fn} = takers.shift();

        setImmediate(() => fn(value));

        callback(true);
      } else {
        putters.push({fn: callback, value});
      }
    },

    take(callback = () => {}) {
      if (closed) return callback(CLOSED);

      if (putters.length) {
        const {fn, value} = putters.shift();

        setImmediate(() => fn(true));

        callback(value);
      } else {
        takers.push({fn: callback});
      }
    },

    close() {
      if (closed) return;

      closed = true;

      while (takers.length) {
        const {fn} = takers.shift();

        setImmediate(() => fn(CLOSED));
      }

      while (putters.length) {
        const {fn} = putters.shift();

        setImmediate(() => fn(false));
      }
    },

    isClosed() {
      return closed;
    },
  };
}

function runner(fn, ...args) {
  return new Promise(resolve => {
    const it = fn(...args);

    function step(value) {
      const result = it.next(value);

      if (!result.done) {
        runEffect(result.value).then(step);
      } else {
        resolve(result.value);
      }
    }

    setImmediate(step);
  });
}

function runEffect(value) {
  if (!value || !value.effect) return Promise.resolve(value);

  if (value.effect === 'CALL') {
    const [fn, ...fnArgs] = value.args;

    return runEffect(fn(...fnArgs));
  }

  if (value.effect === 'FORK') {
    const [fn, ...fnArgs] = value.args;

    setImmediate(() => runEffect(fn(...fnArgs)));

    return Promise.resolve();
  }

  if (value.effect === 'PUT') {
    const [chan, val] = value.args;

    return new Promise(resolve => chan.put(val, resolve));
  }

  if (value.effect === 'TAKE') {
    const [chan] = value.args;

    return new Promise(resolve => chan.take(resolve));
  }

  throw new Error('Unknown effect');
}

function effect(type, ...args) {
  return {
    effect: type,
    args,
  };
}
