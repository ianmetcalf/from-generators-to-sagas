function runner(fn, ...args) {
  const it = fn(...args);

  function step(value) {
    const result = it.next(value);

    if (!result.done) {
      setImmediate(() => step(result.value));
    }
  }

  setImmediate(step);
}
