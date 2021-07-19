import fs from 'fs'
import { dcBot, tgBot, ircBot, chnList } from 'src/util/bots'

import * as logger from 'src/modules/logger'

import { MessageEmbed as DiscordMessageEmbed } from 'discord.js'

export type send = ( msg: {
  tMsg: string;
  dMsg: string | DiscordMessageEmbed;
  iMsg: string;
}) => void;

export type event = {
  name: string,
  fire: ( send: send ) => void;
}

export function bindEvent( event: event ) {
  logger.info( `\x1b[33m[EVT]\x1b[0m Loading ${ event.name }` );
  event.fire( function ( { tMsg, dMsg, iMsg } ) {
    let dcChn = dcBot.channels.cache.get( chnList.DCREV )
    if ( dcChn.isText() ) dcChn.send( dMsg );
    tgBot.telegram.sendMessage( chnList.TGREV , tMsg , {
      // eslint-disable-next-line camelcase
      parse_mode: 'HTML',
      // eslint-disable-next-line camelcase
      disable_web_page_preview: true
    } );
    ircBot.say( chnList.IRCREV , iMsg );
  } );
}

logger.bot( 'Loading events:' );

const eventFiles = fs
  .readdirSync( process.cwd() + '/src/events' )
  .filter( ( file ) => file.endsWith( '.js' ) );

for ( const file of eventFiles ) {
  const event: event = require( process.cwd() + `/src/events/${ file }` );
  bindEvent( event );
}