import { default as config } from 'src/util/config';

import { Context } from 'icg/lib/handlers/Context';
import { MessageHandler } from 'icg/lib/handlers/MessageHandler';

import * as logger from 'src/modules/logger';

export interface ExtendsMap<T extends string, S, M extends Record<T, S>> extends Map<T, S> {
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

export type handlers = {
	IRC: import( './lib/handlers/IRCMessageHandler' ).IRCMessageHandler;
	Telegram: import( './lib/handlers/TelegramMessageHandler' ).TelegramMessageHandler;
	Discord: import( './lib/handlers/DiscordMessageHandler' ).DiscordMessageHandler;
}

type handlerClasses = {
	IRC: {
		object: typeof import( './lib/handlers/IRCMessageHandler' ).IRCMessageHandler;
		options: typeof config.IRC;
	};
	Telegram: {
		object: typeof import( './lib/handlers/TelegramMessageHandler' ).TelegramMessageHandler;
		options: typeof config.Telegram;
	};
	Discord: {
		object: typeof import( './lib/handlers/DiscordMessageHandler' ).DiscordMessageHandler;
		options: typeof config.Discord;
	};
}

const botSymbol: unique symbol = Symbol();

// 所有擴充套件包括傳話機器人都只與該物件打交道
export const Manager: {
	handlers: ExtendsMap<string, MessageHandler, handlers>,

	handlerClasses: ExtendsMap<string, {
		object: typeof MessageHandler;
		options: typeof config.IRC | typeof config.Telegram | typeof config.Discord;
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	}, handlerClasses>,

	config: typeof config,

	global: {
		Context: typeof Context;
		Message: typeof MessageHandler;
		readonly bot: typeof botSymbol;
	}
} = {
	handlers: new Map(),
	handlerClasses: new Map(),
	config: config,
	global: {
		Context,
		Message: MessageHandler,
		bot: botSymbol
	}
};

// 启动各机器人
const enabledClients: string[] = [];
for ( const type of allHandlers.keys() ) {
	if ( config[ type ] && !config[ type ].disabled ) {
		enabledClients.push( type );
	}
}
logger.info( `Enabled clients: ${ enabledClients.join( ', ' ) }` );

for ( const client of enabledClients ) {
	logger.info( `Starting ${ client } bot...` );

	const options = config[ client ];
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Handler: typeof MessageHandler = require( `./lib/handlers/${ allHandlers.get( client ) }` )[ allHandlers.get( client ) ];
	const handler: MessageHandler = new Handler( options );
	handler.start();

	Manager.handlers.set( client, handler );
	Manager.handlerClasses.set( client, {
		object: Handler,
		options: options
	} );

	logger.info( `${ client } bot has started.` );
}
