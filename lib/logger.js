// Lightweight client-side logger wrapper
// Usage: import logger from '../lib/logger'
// logger.debug(...), logger.info(...), logger.warn(...), logger.error(...)

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 }

// Determine default log level: allow build-time override via NEXT_PUBLIC_LOG_LEVEL
// or runtime override via localStorage.LOG_LEVEL. In development default to debug,
// in production default to warn.
function getDefaultLevel() {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_LOG_LEVEL) {
    return process.env.NEXT_PUBLIC_LOG_LEVEL
  }
  if (typeof window !== 'undefined' && window.__APP_LOG_LEVEL__) {
    return window.__APP_LOG_LEVEL__
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    return 'debug'
  }
  return 'warn'
}

let currentLevelName = getDefaultLevel()
let currentLevel = LEVELS[currentLevelName] || LEVELS.debug

function loadRuntimeOverride() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const v = window.localStorage.getItem('LOG_LEVEL')
      if (v && LEVELS[v]) {
        currentLevelName = v
        currentLevel = LEVELS[v]
      }
    }
  } catch (e) {
    // ignore
  }
}

loadRuntimeOverride()

function shouldLog(levelName) {
  const v = LEVELS[levelName]
  if (!v) return false
  return v >= currentLevel
}

function prefix(args) {
  // include a short prefix to identify logs from this app
  try {
    return ['[tarot]', ...args]
  } catch (e) {
    return args
  }
}

const safeConsole = typeof console !== 'undefined' ? console : { log: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }

const logger = {
  setLevel(name) {
    if (LEVELS[name]) {
      currentLevelName = name
      currentLevel = LEVELS[name]
      try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('LOG_LEVEL', name) } catch(_) {}
    }
  },
  getLevel() { return currentLevelName },
  debug(...args) {
    if (shouldLog('debug')) safeConsole.debug(...prefix(args))
  },
  info(...args) {
    if (shouldLog('info')) safeConsole.info(...prefix(args))
  },
  warn(...args) {
    if (shouldLog('warn')) safeConsole.warn(...prefix(args))
  },
  error(...args) {
    if (shouldLog('error')) safeConsole.error(...prefix(args))
  },
  log(...args) {
    if (shouldLog('info')) safeConsole.log(...prefix(args))
  }
}

export default logger
