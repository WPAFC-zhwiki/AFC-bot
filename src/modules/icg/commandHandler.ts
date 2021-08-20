import { Manager } from 'icg/init';
import * as logger from 'src/modules/logger';

import { command } from 'icg/command';

import { addCommand, getUIDFromContext, parseUID } from 'icg/lib/message';
import { Context } from 'icg/lib/handlers/Context';
import { prepareBridgeMsg } from './transport';
import delay from './lib/delay';
import config from 'src/util/config';

const tg = Manager.handlers.get( 'Telegram' );
const dc = Manager.handlers.get( 'Discord' );
const irc = Manager.handlers.get( 'IRC' );

// eslint-disable-next-line no-shadow
export function bindCommand( command: command, clients?: string[] ): void {
	logger.info( `\x1b[33m[CMD]\x1b[0m Loading ${ command.name }${ clients ? ` (enable in client ${ clients.join( ',' ) })` : '' }` );
	addCommand( command.name, function ( context: Context ) {
		command.run( { dcBot: dc.rawClient, tgBot: tg.rawClient, ircBot: irc.rawClient }, context.param.split( ' ' ),
			async function ( { tMsg, dMsg, iMsg }, iserror, eMsg ) {
				const that = parseUID( getUIDFromContext( context, context.to ) );

				if ( iserror ) {
					tMsg = dMsg = iMsg = eMsg;
				}

				switch ( context.handler.type ) {
					case 'Telegram':
						tg.reply( context, tMsg );
						break;
					case 'IRC':
						irc.reply( context, iMsg );
						break;
					case 'Discord':
						dc.reply( context, dMsg );
						break;
				}

				prepareBridgeMsg( context );

				if ( context.extra.mapto ) {
					await delay( 1000 );

					for ( const t of context.extra.mapto ) {
						if ( t === that.uid ) {
							continue;
						}
						const s = parseUID( t );
						if ( s.client === 'Discord' && dMsg ) {
							dc.say( s.id, dMsg );
						} else if ( s.client === 'Telegram' && tMsg ) {
							tg.sayWithHTML( s.id, tMsg, {
								disable_web_page_preview: true
							} );
						} else if ( s.client === 'IRC' && iMsg ) {
							iMsg.split( '\n' ).forEach( function ( m ) {
								irc.say( s.id, m );
							} );
						}
					}
				}
			} );
	}, {
		allowedClients: clients,
		enables: config.enableCommands
	} );
}

// eslint-disable-next-line no-shadow
export function tgCommand( command: command ): void {
	bindCommand( command, [ 'Telegram' ] );
}

// eslint-disable-next-line no-shadow
export function dcCommand( command: command ): void {
	bindCommand( command, [ 'Discord' ] );
}

// eslint-disable-next-line no-shadow
export function ircCommand( command: command ): void {
	bindCommand( command, [ 'IRC' ] );
}
