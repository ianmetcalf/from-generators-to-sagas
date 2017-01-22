function runner(fn, ...args) {
  return new Promise(resolve => {
    const it = fn(...args);

    function step(value) {
      const result = it.next(value);

      if (!result.done) {
        Promise.resolve(result.value).then(step);
      } else {
        resolve(result.value);
      }
    }

    setImmediate(step);
  });
}
