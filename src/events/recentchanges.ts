import * as logger from 'src/modules/logger'

import { mwBot } from 'src/util/bots'

import { event } from 'src/modules/events'

const Event: event = {
  name: "recentchanges",
  fire: async ( send ) => {
    await mwBot.plogin
    let stream = new mwBot.stream( "recentchange", {
      onopen: () => { logger.success( "EventSource online." ) },
      onerror: ( err ) => { logger.error( "EventSource:", err ) }
    } );
    stream.addListener( ( data ) => {
      return (
        data.wiki === 'zhwiki'
      )
    }, async ( data ) => {
      return;
      logger.info( data )
    } )
  },
}

export { Event };