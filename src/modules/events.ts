import fs from 'fs';
import { dcBot, tgBot, ircBot } from 'src/util/bots';
import { default as config } from 'src/util/config';

import * as logger from 'src/modules/logger';

import { MessageEmbed as DiscordMessageEmbed } from 'discord.js';
import { parseUID } from './icg/lib/message';

export type send = ( msg: {
	tMsg: string;
	dMsg: string | DiscordMessageEmbed;
	iMsg: string;
} ) => void;

export type event = {
	name: string,
	// eslint-disable-next-line no-shadow
	fire: ( send: send ) => void;
}

// eslint-disable-next-line no-shadow
export function bindEvent( event: event ): void {
	logger.info( `\x1b[33m[EVT]\x1b[0m Loading ${ event.name }` );
	event.fire( function ( { tMsg, dMsg, iMsg } ) {
		( config.enableEvents || [] ).forEach( async function ( k ) {
			const f = parseUID( k );
			if ( f.client === 'Discord' && dMsg ) {
				if ( dcBot.channels.cache.get( f.id ) ) {
					const ch = dcBot.channels.cache.get( f.id );
					if ( ch.isText() ) {
						ch.send( dMsg );
					} else {
						logger.error( `Can't send event ${ event.name } to discord channel ${ f.id } because it doesn't a text channel.` );
					}
				} else {
					const ch = await dcBot.channels.fetch( f.id, true );
					if ( ch.isText() ) {
						ch.send( dMsg );
					} else {
						logger.error( `Can't send event ${ event.name } to discord channel ${ f.id } because it doesn't a text channel.` );
					}
				}
			} else if ( f.client === 'Telegram' && tMsg ) {
				tgBot.telegram.sendMessage( f.id, tMsg, {
					parse_mode: 'HTML',
					disable_web_page_preview: true
				} );
			} else if ( f.client === 'IRC' && iMsg ) {
				iMsg.split( '\n' ).forEach( function ( m ) {
					ircBot.send( f.id, m );
				} );
			}
		} );
	} );
}

logger.bot( 'Loading events:' );

const eventFiles = fs
	.readdirSync( process.cwd() + '/src/events' )
	.filter( ( file ) => file.endsWith( '.ts' ) );

for ( const file of eventFiles ) {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Event: event = require( process.cwd() + `/src/events/${ file.replace( /.ts/, '' ) }` ).Event;
	bindEvent( Event );
}
