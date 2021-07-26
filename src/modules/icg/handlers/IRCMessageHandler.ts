/*
 * @name 使用通用接口处理 IRC 消息
 */

import { MessageHandler } from 'icg/handlers/MessageHandler'
import { Context } from 'icg/handlers/Context'
import IRCTS from 'irc';
import irc = require('irc-upd');
import color = require('irc-colors');
import lodash from 'lodash';

import * as logger from 'src/modules/logger'

import { ConfigTS } from 'src/util/type';

import { ircBot } from 'src/util/bots'

export type IRCRawMessage = {
	/**
	 * The prefix for the message
	 */
    prefix?: string;

	/**
	 * The nickname portion of the prefix
	 */
    nick?: string;

	/**
	 * The username portion of the prefix
	 */
    user?: string;

	/**
	 * The hostname portion of the prefix
	 */
    host?: string;

	/**
	 * The servername (if the prefix was a servername)
	 */
    server: string;

	/**
	 * The command exactly as sent from the server
	 */
    rawCommand: string;

	/**
	 * Human readable version of the command
	 */
    command: string;

    commandType: 'normal' | 'error' | 'reply';

	/**
	 * arguments to the command
	 */
    args: string[];
}

/**
 * 使用通用接口处理 IRC 消息
 */
export class IRCMessageHandler extends MessageHandler {
	protected readonly _client: IRCTS.Client;
	protected readonly _type = 'IRC';
	protected readonly _id = 'I';

	private _maxLines: number;

	private readonly _splitsep: {
		prefix: string;
		postfix: string;
	} = {
		prefix: '',
		postfix: 'string'
	};

	public constructor( config: ConfigTS[ 'IRC' ] ) {
		super( config );

		// 加载机器人
		const botConfig: ConfigTS[ 'IRC' ][ 'bot' ] = config.bot;
		const ircOptions: ConfigTS[ 'IRC' ][ 'options' ] = config.options;
		const client: IRCTS.Client = ircBot

		client.on( 'registered', function () {
			logger.info( 'IRCBot has been registered.' );
		} );

		client.on( 'join', function ( channel, nick ) {
			if ( nick === client.nick ) {
				logger.info( `IRCBot has joined channel: ${ channel } as ${ nick }` );
			}
		} );

		client.on( 'error', function ( message ) {
			console.log(message)
			if ( message instanceof Error ) {
				logger.error( `IRCBot error: ${ message }` );
			} else {
				try {
					logger.error( `IRCBot error: ${ JSON.stringify( message ) }` );
				} catch ( e ) {
					logger.error( `IRCBot error: ${ message }` );
				}
			}
		} );

		// 加载设置

		this._client = client;
		this._maxLines = ircOptions.maxLines || 4;

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const that = this;

		// 绑定事件
		function processMessage( from: string, to: string, text: string, rawdata: IRCRawMessage, isAction = false ) {

			if (
				!that._enabled ||
				from === client.nick ||
				(ircOptions.ignore || []).map( function ( name ) {
					return new RegExp( `^${ lodash.escapeRegExp( name ) }\\d*$` );
				} ).filter( function ( reg ) {
					return reg.exec( from );
				} ).length
			) {
				return;
			}

			// 去除訊息中的格式字元
			const plainText: string = color.stripColorsAndStyle( text );

			const context = new Context( {
				from: from,
				to: to === client.nick ? to : to.toLowerCase(),
				nick: from,
				text: plainText,
				isPrivate: to === client.nick,
				extra: {},
				handler: that,
				_rawdata: rawdata
			} );

			if ( isAction ) {
				context.extra.isAction = true;
			}

			// 檢查是不是命令
			for ( const [ cmd, callback ] of that._commands ) {
				if ( plainText.startsWith( cmd ) ) {
					let param = plainText.trim().substring( cmd.length );
					if ( param === '' || param.startsWith( ' ' ) ) {
						param = param.trim();

						context.command = cmd;
						context.param = param;

						if ( typeof callback === 'function' ) {
							callback( context, cmd, param );
						}

						that.emit( 'command', context, cmd, param );
						that.emit( `command#${ cmd }`, context, param );
					}
				}
			}

			that.emit( 'text', context );
		}

		client.on( 'message', processMessage );
		client.on( 'action', ( from: string, to: string, text: string, rawdata: IRCRawMessage ) => {
			processMessage( from, to, text, rawdata, true );
		} );

		client.on( 'join', function ( channel: string, nick: string, message: IRCRawMessage ) {
			that.emit( 'join', channel, nick, message );
		} );

		client.on( 'nick', function ( oldnick: string, newnick: string, channels: string, message: IRCRawMessage ) {
			that.emit( 'nick', oldnick, newnick, channels, message );
		} );

		client.on( 'quit', function ( nick: string, reason: string, channels: string, message: IRCRawMessage ) {
			that.emit( 'quit', nick, reason, channels, message );
		} );

		client.on( 'part', function ( channel: string, nick: string, reason: string, message: IRCRawMessage ) {
			that.emit( 'part', channel, nick, reason, message );
		} );

		client.on( 'kick', function ( channel: string, nick: string, by: string, reason: string, message: IRCRawMessage ) {
			that.emit( 'kick', channel, nick, by, reason, message );
		} );

		client.on( 'kill', function ( nick: string, reason: string, channels: string, message: IRCRawMessage ) {
			that.emit( 'kill', nick, reason, channels, message );
		} );

		client.on( 'topic', function ( channel: string, topic: string, nick: string, message: IRCRawMessage ) {
			that.emit( 'topic', channel, topic, nick, message );
		} );

		client.on( 'registered', function ( message: IRCRawMessage ) {
			that.emit( 'registered', message );
		} );
	}

	public on( event: 'command', listener: ( context: Context, comand: string, param: string ) => void ): this;

	public on( event: 'text', listener: ( context: Context ) => void ): this;

	public on( event: 'join', listener: ( channel: string, nick: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'nick', listener: ( oldnick: string, newnick: string, channels: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'quit', listener: ( nick: string, reason: string, channels: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'part', listener: ( channel: string, nick: string, reason: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'kick', listener: ( channel: string, nick: string, by: string, reason: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'kill', listener: ( nick: string, reason: string, channels: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'topic', listener: ( channel: string, topic: string, nick: string, message: IRCRawMessage ) => void ): this;

	public on( event: 'registered', listener: ( message: IRCRawMessage ) => void ): this;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public on( event: string | symbol, listener: ( ...args: any[] ) => void ): this {
		return super.on( event, listener );
	}

	public get maxLines(): number {
		return this._maxLines;
	}

	public set maxLines( value: number ) {
		this._maxLines = value;
	}

	public get splitPrefix(): string {
		return this._splitsep.prefix;
	}

	public set splitPrefix( p: string ) {
		this._splitsep.prefix = p;
	}

	public get splitPostfix(): string {
		return this._splitsep.postfix;
	}

	public set splitPostfix( p: string ) {
		this._splitsep.postfix = p;
	}

	public get nick(): string {
		return this._client.nick;
	}

	public async say( target: string, message: string, options: {
		isAction?: boolean
	} = {} ): Promise<void> {
		if ( !this._enabled ) {
			throw new Error( 'Handler not enabled' );
		} else if ( !target.length ) {
			return;
		} else {
			const lines = this.splitText( message, 449, this._maxLines );
			if ( options.isAction ) {
				this._client.action( target, lines.join( '\n' ) );
			} else {
				this._client.say( target, lines.join( '\n' ) );
			}
		}
	}

	public async reply( context: Context, message: string, options: {
		isPrivate?: boolean;
		noPrefix?: boolean;
		isAction?: boolean;
	} = {} ): Promise<void> {
		if ( context.isPrivate ) {
			await this.say( String( context.from ), message, options );
		} else {
			if ( options.noPrefix ) {
				await this.say( String( context.to ), `${ message }`, options );
			} else {
				await this.say( String( context.to ), `${ context.nick }: ${ message }`, options );
			}
		}
	}

	public get chans(): Record<string, {
        key: string;
        serverName: string;
        users: Record<string, string>;
        mode: string;
        created: string;
    }> {
		return this._client.chans;
	}

	public whois( nick: string ): Promise<IRCTS.IWhoisData> {
		return new Promise( function ( resolve ) {
			this._client.whois( nick, resolve );
		} );
	}

	public splitText( text: string, maxBytesPerLine = 449, maxLines = 0 ): string[] {
		const text2: string = text.replace( /\n+/gu, '\n' ).replace( /\n*$/gu, '' );
		const lines: string[] = [];
		let line: string[] = [];
		let bytes = 0;
		const seplen: number = this._splitsep.prefix.length + this._splitsep.postfix.length;

		if ( maxBytesPerLine < 10 ) {
			return [];
		}

		for ( const ch of text2 ) {
			if ( ch === '\n' ) {
				lines.push( line.join( '' ) );
				line = [];
				bytes = 0;
				if ( maxLines > 0 && lines.length === maxLines + 1 ) {
					break;
				}
			} else {
				const code = ch.codePointAt( 0 );
				const b = ( code <= 0x7F ) ? 1 : (
					( code <= 0x7FF ) ? 2 : (
						( code <= 0xFFFF ) ? 3 : (
							( code <= 0x10FFFF ) ? 4 : 5
						)
					)
				);

				if ( bytes + b > maxBytesPerLine - seplen ) {
					line.push( this._splitsep.postfix );
					lines.push( line.join( '' ) );
					line = [ this._splitsep.prefix, ch ];
					bytes = b;
					if ( maxLines > 0 && lines.length === maxLines ) {
						lines.push( line.join( '' ) );
						break;
					}
				} else {
					line.push( ch );
					bytes += b;
				}
			}
		}

		if ( maxLines > 0 && lines.length > maxLines ) {
			lines.pop();
			lines.push( '...' );
		} else if ( line.length > 0 ) {
			if ( maxLines > 0 && lines.length === maxLines ) {
				lines.push( '...' );
			} else {
				lines.push( line.join( '' ) );
			}
		}

		return lines;
	}

	public join( channel: string, callback?: IRCTS.handlers.IJoinChannel ): void {
		this._client.join( channel, callback );
	}

	public part( channel: string, message: string, callback: IRCTS.handlers.IPartChannel ): void {
		this._client.part( channel, message, callback );
	}

	public async start(): Promise<void> {
		if ( !this._started ) {
			this._started = true;
			this._client.connect();
		}
	}

	public async stop(): Promise<void> {
		if ( !this._started ) {
			this._started = false;
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			this._client.disconnect( 'disconnect by operator.', function () { } );
		}
	}
}