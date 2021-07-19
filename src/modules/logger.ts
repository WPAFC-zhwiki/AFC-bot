import { time } from 'src/util/fn';

export const log = ( ...msgs: any[] ) => {
  console.log( `${ time() } |`, ...msgs )
}

export const error = ( ...msgs: any[] ) => {
  log( `\x1b[41m\[ERROR\]\x1b[0m`, ...msgs )
}

export const warn = ( ...msgs: any[] ) => {
  log( `\x1b[31m\[WARN\]\x1b[0m`, ...msgs )
}

export const info = ( ...msgs: any[] ) => {
  log( `\x1b[33m\[INFO\]\x1b[0m`, ...msgs )
}

export const bot = ( ...msgs: any[] ) => {
  log( `\x1b[34m\[BOT\]\x1b[0m`, ...msgs )
}

export const success = ( ...msgs: any[] ) => {
  log( `\x1b[32m\[SUCCESS\]`, ...msgs )
}

export const debug = ( ...msgs: any[] ) => {
  log( `\x1b[34m\[DEBUG\]\x1b[0m`, ...msgs )
}
