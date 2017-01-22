function sym(id) {
  return `@@redux-saga/${id}`
}

function ident(v) {
  return v
}

function check(value, predicate, error) {
  if(!predicate(value)) {
    log('error', 'uncaught at check', error)
    throw new Error(error)
  }
}

function effect(type, payload) {
  return {
    [IO]: true,
    [type]: payload,
  }
}

TASK           = sym('TASK')
IO             = sym('IO')
TAKE           = 'TAKE'
PUT            = 'PUT'
RACE           = 'RACE'
CALL           = 'CALL'
CPS            = 'CPS'
FORK           = 'FORK'
JOIN           = 'JOIN'
CANCEL         = 'CANCEL'
SELECT         = 'SELECT'
ACTION_CHANNEL = 'ACTION_CHANNEL'
CANCELLED      = 'CANCELLED'
FLUSH          = 'FLUSH'

is = {
  undef     : v => v === null || v === undefined,
  notUndef  : v => v !== null && v !== undefined,
  func      : f => typeof f === 'function',
  number    : n => typeof n === 'number',
  array     : Array.isArray,
  promise   : p => p && is.func(p.then),
  iterator  : it => it && is.func(it.next) && is.func(it.throw),
  task      : t => t && t[TASK],
  observable: ob => ob && is.func(ob.subscribe),
  buffer    : buf => buf && is.func(buf.isEmpty) && is.func(buf.take) && is.func(buf.put),
  pattern   : pat => pat && ((typeof pat === 'string') || (typeof pat === 'symbol') || is.func(pat) || is.array(pat)),
  channel   : ch => ch && is.func(ch.take) && is.func(ch.close),
  helper    : it => it && it[HELPER]
}

function take(patternOrChannel = '*') {
  if (arguments.length) {
    check(arguments[0], is.notUndef, 'take(patternOrChannel): patternOrChannel is undefined')
  }
  if (is.pattern(patternOrChannel)) {
    return effect(TAKE, { pattern: patternOrChannel })
  }
  if (is.channel(patternOrChannel)) {
    return effect(TAKE, { channel: patternOrChannel })
  }
  throw new Error(`take(patternOrChannel): argument ${String(patternOrChannel)} is not valid channel or a valid pattern`)
}

take.maybe = (...args) => {
  const eff = take(...args)
  eff[TAKE].maybe = true
  return eff
}

function put(channel, action) {
  if(arguments.length > 1) {
    check(channel, is.notUndef, 'put(channel, action): argument channel is undefined')
    check(channel, is.channel, `put(channel, action): argument ${channel} is not a valid channel`)
    check(action, is.notUndef, 'put(channel, action): argument action is undefined')
  } else {
    check(channel, is.notUndef, 'put(action): argument action is undefined')
    action = channel
    channel = null
  }
  return effect(PUT, {channel, action})
}

put.resolve = (...args) => {
  const eff = put(...args)
  eff[PUT].resolve = true
  return eff
}

function race(effects) {
  return effect(RACE, effects)
}

function getFnCallDesc(meth, fn, args) {
  check(fn, is.notUndef, `${meth}: argument fn is undefined`)

  let context = null
  if(is.array(fn)) {
    [context, fn] = fn
  } else if(fn.fn) {
    ({context, fn} = fn)
  }
  check(fn, is.func, `${meth}: argument ${fn} is not a function`)

  return {context, fn, args}
}

function call(fn, ...args) {
  return effect(CALL, getFnCallDesc('call', fn, args))
}

function apply(context, fn, args = []) {
  return effect(CALL, getFnCallDesc('apply', {context, fn}, args))
}

function cps(fn, ...args) {
  return effect(CPS, getFnCallDesc('cps', fn, args))
}

function fork(fn, ...args) {
  return effect(FORK, getFnCallDesc('fork', fn, args))
}

function spawn(fn, ...args) {
  const eff = fork(fn, ...args)
  eff[FORK].detached = true
  return eff
}

function select(selector, ...args) {
  if(arguments.length === 0) {
    selector = ident
  } else {
    check(selector, is.notUndef, 'select(selector,[...]): argument selector is undefined')
    check(selector, is.func, `select(selector,[...]): argument ${selector} is not a function`)
  }
  return effect(SELECT, {selector, args})
}

function takeEvery(patternOrChannel, worker, ...args) {
  return fork(takeEveryHelper, patternOrChannel, worker, ...args)
}

function takeLatest(patternOrChannel, worker, ...args) {
  return fork(takeLatestHelper, patternOrChannel, worker, ...args)
}

function throttle(ms, pattern, worker, ...args) {
  return fork(throttleHelper, ms, pattern, worker, ...args)
}

function kThrow(err) {
  throw err
}

function kReturn(value) {
  return {value, done: true}
}

function makeIterator(next, thro = kThrow, name = '', isHelper) {
  const iterator = {name, next, throw: thro, return: kReturn}

  if (isHelper) {
    iterator[HELPER] = true
  }
  if(typeof Symbol !== 'undefined') {
    iterator[Symbol.iterator] = () => iterator
  }
  return iterator
}

function qEnd() {}

function fsmIterator(fsm, q0, name = 'iterator') {
  const done = {done: true, value: undefined}

  let updateState, qNext = q0

  function next(arg, error) {
    if(qNext === qEnd) {
      return done
    }

    if(error) {
      qNext = qEnd
      throw error
    } else {
      updateState && updateState(arg)
      let [q, output, _updateState] = fsm[qNext]()
      qNext = q
      updateState = _updateState
      return qNext === qEnd ? done : output
    }
  }

  return makeIterator(
    next,
    error => next(null, error),
    name,
    true
  )
}

function safeName(patternOrChannel) {
  if (is.channel(patternOrChannel)) {
    return 'channel'
  } else if (Array.isArray(patternOrChannel)) {
    return String(patternOrChannel.map(entry => String(entry)))
  } else {
    return String(patternOrChannel)
  }
}

function takeEveryHelper(patternOrChannel, worker, ...args) {
  const yTake = {done: false, value: take(patternOrChannel)}
  const yFork = ac => ({done: false, value: fork(worker, ...args, ac)})

  let action, setAction = ac => action = ac

  return fsmIterator({
    q1() { return ['q2', yTake, setAction] },
    q2() { return action === END ? [qEnd] : ['q1', yFork(action)] }
  }, 'q1', `takeEvery(${safeName(patternOrChannel)}, ${worker.name})`)
}

function takeLatestHelper(patternOrChannel, worker, ...args) {
  const yTake = {done: false, value: take(patternOrChannel)}
  const yFork = ac => ({done: false, value: fork(worker, ...args, ac)})
  const yCancel = task => ({done: false, value: cancel(task)})

  let task, action
  const setTask = t => task = t
  const setAction = ac => action = ac

  return fsmIterator({
    q1() { return ['q2', yTake, setAction] },
    q2() {
      return action === END
        ? [qEnd]
        : task ? ['q3', yCancel(task)] : ['q1', yFork(action), setTask]
    },
    q3() {
      return ['q1', yFork(action), setTask]
    }
  }, 'q1', `takeLatest(${safeName(patternOrChannel)}, ${worker.name})`)
}
