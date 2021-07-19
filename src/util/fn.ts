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