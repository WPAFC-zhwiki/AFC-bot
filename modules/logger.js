const fn = require(process.cwd() + '/util/fn.js')

const log = (...msgs) => {
  console.log(`${fn.time()} |`, ...msgs)
}

const error = (...msgs) => {
  log(`\x1b[41m\[ERROR\]\x1b[0m`, ...msgs)
}

const warn = (...msgs) => {
  log(`\x1b[31m\[WARN\]\x1b[0m`, ...msgs)
}

const info = (...msgs) => {
  log(`\x1b[33m\[INFO\]\x1b[0m`, ...msgs)
}

const bot = (...msgs) => {
  log(`\x1b[34m\[BOT\]\x1b[0m`, ...msgs)
}

const success = (...msgs) => {
  log(`\x1b[32m\[SUCCESS\]`, ...msgs)
}

const debug = (...msgs) => {
  log(`\x1b[34m\[DEBUG\]\x1b[0m`, ...msgs)
}

module.exports = {
  log,
  warn,
  error,
  info,
  bot,
  success,
  debug
}