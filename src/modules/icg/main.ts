/**
 * LilyWhiteBot
 * https://github.com/mrhso/LilyWhiteBot
 *
 * @author      vjudge1, Ishisashi
 * @description
 */
import { dcBot, tgBot, chnList } from 'src/util/bots';
import fs from 'fs'
import { bindCommand } from 'icg/commandHandler'

import { Context } from 'icg/handlers/Context'
import { MessageHandler } from 'icg/handlers/MessageHandler'
import { loadConfig } from 'icg/util'

import * as logger from 'src/modules/logger'

import { ifEnable, isEnable } from 'icg/plugins/enable'

import { command } from 'icg/command'

export interface ExtendsMap<T extends string | number, S, M extends Record<T, S>> extends Map<T, S> {
  get<K extends keyof M>( key: K ): M[ K ];
	get( key: T ): S;
  set<K extends keyof M>( key: K, value: M[ K ] ): this;
	set( key: T, value: S ): this;
}

const allHandlers: ExtendsMap<string, string, Record<string, string>> = new Map( [
  [ 'IRC', 'IRCMessageHandler' ],
  [ 'Telegram', 'TelegramMessageHandler' ],
  [ 'Discord', 'DiscordMessageHandler' ]
] );

export const config = loadConfig();

process.on( 'unhandledRejection', ( reason, promise ) => {
  promise.catch( ( e ) => {
    logger.error( 'Unhandled Rejection: ', e );
  } );
} );

process.on( 'uncaughtException', ( err, origin ) => {
  logger.error( 'Uncaught exception:', err );
} );

process.on( 'rejectionHandled', ( promise ) => {
  // 忽略
} );

export type handlers = {
	IRC: import( 'icg/handlers/IRCMessageHandler' ).IRCMessageHandler;
	Telegram: import( 'icg/handlers/TelegramMessageHandler' ).TelegramMessageHandler;
	Discord: import( 'icg/handlers/DiscordMessageHandler' ).DiscordMessageHandler;
}

type handlerClasses = {
	IRC: {
		object: typeof import( 'icg/handlers/IRCMessageHandler' ).IRCMessageHandler;
		options: typeof config.IRC;
	};
	Telegram: {
		object: typeof import( 'icg/handlers/TelegramMessageHandler' ).TelegramMessageHandler;
		options: typeof config.Telegram;
	};
	Discord: {
		object: typeof import( 'icg/handlers/DiscordMessageHandler' ).DiscordMessageHandler;
		options: typeof config.Discord;
	};
}

// 所有擴充套件包括傳話機器人都只與該物件打交道
export const Manager: {
	handlers: ExtendsMap<string, MessageHandler, handlers>,

	handlerClasses: ExtendsMap<string, {
		object: typeof MessageHandler;
		options: typeof config.IRC | typeof config.Telegram | typeof config.Discord;
	}, handlerClasses>,

	config: typeof config,

	global: {
		Context: typeof Context;
		Message: typeof MessageHandler;
		ifEnable: typeof ifEnable;
		isEnable: typeof isEnable
	}
} = {
	handlers: new Map(),
	handlerClasses: new Map(),
	config: config,
	global: {
		Context,
		Message: MessageHandler,
		ifEnable,
		isEnable
	}
};

// 启动各机器人
let enabledClients = [];
for ( let type of allHandlers.keys() ) {
  if ( config[ type ] && !config[ type ].disabled ) {
    enabledClients.push( type );
  }
}
logger.log( `\x1b[33m[Connect]\x1b[0m Enabled clients: ${ enabledClients.join( ', ' ) }` );

for ( let client of enabledClients ) {
  const options = config[ client ];
  const Handler: typeof MessageHandler = require( `./handlers/${ allHandlers.get( client ) }` )[ allHandlers.get( client ) ];
  const handler = new Handler( options );

  handler.start();

  Manager.handlers.set( client, handler );
  Manager.handlerClasses.set( client, {
    object: Handler,
    options: options
  } );
}

/**
 * 載入擴充套件
 */
logger.info( '\x1b[33m[Connect]\x1b[0m Loading plugins...' );
Manager.config = config;
for ( let plugin of config.plugins ) {
  try {
    logger.info( `\x1b[33m[Connect]\x1b[0m Loading plugin: ${ plugin }` );
    let p = require( `./plugins/${ plugin }` );
    if ( p ) {
      config.plugins[ plugin ] = p;
    } else {
      config.plugins[ plugin ] = true;
    }
  } catch ( ex ) {
    logger.error( `\x1b[33m[Connect]\x1b[0m Error while loading plugin ${ plugin }: `, ex );
  }
}
if ( !config.plugins || config.plugins.length === 0 ) {
  logger.info( '\x1b[33m[Connect]\x1b[0m No plugins loaded.' );
}

/**
 * （自訂）指令處理
 */

logger.bot( 'Loading commands:' );

const commandFiles = fs
  .readdirSync( process.cwd() + '/src/modules/icg/commands' )
  .filter( ( file ) => file.endsWith( '.ts' ) );

for ( const file of commandFiles ) {
  const Command: command = require( `./commands/${ file.replace(/.ts/,"") }` ).Command;
  bindCommand( Command );
}