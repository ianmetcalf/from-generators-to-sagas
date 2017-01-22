function now() {
  return Math.floor(Date.now() / 1000);
}

function delay(sec) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000));
}
