function effect(type, ...args) {
  return {
    effect: type,
    args,
  };
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

  throw new Error('Unknown effect');
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
