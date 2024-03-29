import moment from 'moment'

export const time = ( date = moment() ) => {
  return moment( date ).utcOffset( 8 ).format( "YYYY-MM-DD HH:mm:ss" )
}

export const utcTime = ( date = moment() ) => {
  return moment( date ).utcOffset( 0 ).format( "YYYY-MM-DD HH:mm:ss" )
}

export const ago = ( date = moment() ) => {
  return moment( date ).fromNow()
}

export const deepClone = ( object: any ) => {
  return JSON.parse( JSON.stringify( object ) )
}

export const clone = deepClone

export const sleep: ( ms: number ) => Promise<void> = ( ms ) => {
  return new Promise( resolve => {
    setTimeout( () => {
      resolve()
    }, ms )
  } )
}

export const eURIC = ( string: string ) => {
  return encodeURIComponent( string )
}

export const iB = String.fromCharCode( 0x02 )

import TurndownService from 'turndown';

const service = new TurndownService();

export const turndown: typeof TurndownService.prototype.turndown = service.turndown.bind( service );

export const allowBots = (text, user = "LuciferianBot") => {
  if (!new RegExp("\\{\\{\\s*(nobots|bots[^}]*)\\s*\\}\\}", "i").test(text)) return true;
  return (new RegExp("\\{\\{\\s*bots\\s*\\|\\s*deny\\s*=\\s*([^}]*,\\s*)*"+user+"\\s*(?=[,\\}])[^}]*\\s*\\}\\}", "i").test(text)) ? false : new RegExp("\\{\\{\\s*((?!nobots)|bots(\\s*\\|\\s*allow\\s*=\\s*((?!none)|([^}]*,\\s*)*"+user+"\\s*(?=[,\\}])[^}]*|all))?|bots\\s*\\|\\s*deny\\s*=\\s*(?!all)[^}]*|bots\\s*\\|\\s*optout=(?!all)[^}]*)\\s*\\}\\}", "i").test(text);
}