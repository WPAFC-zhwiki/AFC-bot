import { Telegraf as TelegramClient } from 'telegraf';
import {
	Client as DiscordClient,
	Intents as DiscordIntents
} from 'discord.js';
import irc = require( 'irc-upd' )
import { mwn } from 'mwn';
import https from 'https';

import { DiscordBot, TelegramBot, IRCBot, MWConfig } from 'src/util/credentials';

import * as logger from 'src/modules/logger';

import EventSource from 'eventsource';
import { RecentChangeStreamEvent } from 'mwn/build/eventstream';
import HttpsProxyAgent = require( 'src/util/proxy' );

const intents = new DiscordIntents();
intents.add(
	'GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS', 'GUILD_WEBHOOKS', 'GUILD_INVITES',
	'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING', 'DIRECT_MESSAGES',
	'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING'
);

let myAgent: https.Agent = https.globalAgent;
if ( TelegramBot.proxy && TelegramBot.proxy.host ) {
	myAgent = new HttpsProxyAgent( {
		proxyHost: TelegramBot.proxy.host,
		proxyPort: TelegramBot.proxy.port
	} );
}

const dcBot = new DiscordClient( { ws: { intents } } ),
	tgBot = new TelegramClient( TelegramBot.token, {
		telegram: {
			agent: myAgent,
			apiRoot: TelegramBot.apiRoot || 'https://api.telegram.org'
		}
	} );

dcBot.login( DiscordBot.token ).catch( ( e ) => {
	logger.error( '\x1b[31m[DC]\x1b[0m Error:', e );
} );

dcBot.once( 'ready', () => {
	logger.success(
		`\x1b[35m[DC]\x1b[0m login as ${ ''
		}${ dcBot.user.tag } (${ dcBot.user.id })`
	);
} );

tgBot.telegram.getMe().then( ( me ) => {
	logger.success( `\x1b[36m[TG]\x1b[0m login as ${ me.first_name }${ me.last_name || '' }@${ me.username } (${ me.id })` );
} ).catch( ( e ) => {
	logger.error( '\x1b[36m[TG]\x1b[0m Telegraf.telegram.getMe() fail', e );
	return null;
} );

tgBot.launch().then( () => {
	logger.success( '\x1b[36m[TG]\x1b[0m launch......' );
} ).catch( ( e ) => {
	logger.error( '\x1b[36m[TG]\x1b[0m Error:', e );
} );

const ircBot: irc.Client = new irc.Client( IRCBot.server, IRCBot.nick, {
	userName: IRCBot.userName,
	realName: IRCBot.realName,
	port: IRCBot.port,
	autoRejoin: true,
	channels: IRCBot.channels || [],
	secure: IRCBot.secure || false,
	floodProtection: IRCBot.floodProtection || true,
	floodProtectionDelay: IRCBot.floodProtectionDelay || 300,
	sasl: IRCBot.sasl,
	password: IRCBot.sasl_password,
	encoding: IRCBot.encoding || 'UTF-8',
	autoConnect: false
} );

ircBot.connect( () => {
	logger.success( `\x1b[92m[IRC]\x1b[0m login as ${ ircBot.opt.userName }` );
} );

export {
	dcBot,
	tgBot,
	ircBot
};

export let mwBot: mwn;

mwn.init( MWConfig ).then( function ( mwbot ) {
	mwBot = mwbot;
} ).catch( function ( e ) {
	logger.error( e );
	// eslint-disable-next-line no-process-exit
	process.exit( -1 );
} );

// export const mwStream = (() => {
//   logger.info( "Preparing EventSource... ")
//   let stream = new mwBot.stream( "recentchange", {
//     onopen: () => { logger.success( "EventSource online." ) },
//     onerror: ( err ) => { logger.error( "EventSource:", err ) }
//   } );
//   return stream
// })();

const EventStream = new EventSource( 'https://stream.wikimedia.org/v2/stream/recentchange', {
	headers: {
		'User-Agent': MWConfig.userAgent
	}
} );

EventStream.onerror = function ( err ) {
	logger.error( '[afc/event/clean] Recentchange Error (Throw by EventSource):', err );
};

let i = 0;

// eslint-disable-next-line max-len
const EventStreamManager = new Map<number, [( data: RecentChangeStreamEvent ) => boolean, ( data: RecentChangeStreamEvent ) => void]>();

// eslint-disable-next-line max-len
export function recentChange( filter: ( data: RecentChangeStreamEvent ) => boolean, action: ( data: RecentChangeStreamEvent ) => void ): void {
	EventStreamManager.set( i++, [ filter, action ] );
}

EventStream.onmessage = function ( { data } ) {
	const event: RecentChangeStreamEvent = JSON.parse( data );
	EventStreamManager.forEach( function ( [ filter, action ] ) {
		if ( filter( event ) ) {
			try {
				action( event );
			} catch ( e ) {

			}
		}
	} );
};
