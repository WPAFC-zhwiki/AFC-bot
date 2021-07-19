import { MessageHandler, Command } from './MessageHandler';
import { Context } from './Context';

import * as fs from 'fs';
import * as Tls from 'tls';

import { Telegraf, Context as TContext, Telegram } from 'telegraf';
import * as TT from 'telegraf/typings/telegram-types';

import { getFriendlySize, getFriendlyLocation, copyObject } from 'icg/util';

import { ConfigTS } from 'src/util/type';

import { tgBot } from 'src/util/bots'

import * as logger from 'src/modules/logger';

/**
 * 使用通用介面處理 Telegram 訊息
 */
export class TelegramMessageHandler extends MessageHandler {
	protected readonly _client: Telegraf<TContext>;
	protected readonly _type = 'Telegram';
	protected readonly _id = 'T';

	private readonly _start: {
		mode: 'webhook',
		params: {
			path: string,
			tlsOptions: Tls.TlsOptions,
			port: string | number
		}
	} | {
		mode: 'poll',
		params: {
			timeout: number,
			limit: number
		}
	}

	private _username: string;
	private _nickStyle: 'username' | 'fullname' | 'firstname';
	private _startTime: number = new Date().getTime() / 1000;

	public constructor( config: ConfigTS[ 'Telegram' ] ) {
		super( config );

		const botConfig: ConfigTS[ 'Telegram' ][ 'bot' ] = config.bot || {
			token: '',
			timeout: 0,
			limit: 0,
			webhook: {
				port: 0
			},
			apiRoot: 'https://api.telegram.org'
		};
		const tgOptions: ConfigTS[ 'Telegram' ][ 'options' ] = config.options || {
			nickStyle: 'username'
		};

		// 配置文件兼容性处理
		for ( const key of [ 'proxy', 'webhook', 'apiRoot' ] ) {
			botConfig[ key ] = botConfig[ key ] || tgOptions[ key ];
		}

		const client = tgBot

		client.catch( ( err: Error ) => {
			logger.error( `TelegramBot error: ${ err.message }`, err );
		} );

		// 使用轮询机制
		this._start = {
			mode: 'poll',
			params: {
				timeout: botConfig.timeout || 30,
				limit: botConfig.limit || 100
			}
		};

		this._client = client;
		this._nickStyle = tgOptions.nickStyle || 'username';

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const that = this;

		client.telegram.getMe().then( function ( me ) {
			that._username = me.username;
		} );

		client.on( 'message', async function ( ctx, next ) {
			if ( that._enabled && ctx.message && ctx.chat ) {
				if ( ctx.message.date < that._startTime ) {
					return;
				}

				const context = new Context( {
					from: ctx.message.from.id,
					to: ctx.chat.id,
					nick: that._getNick( ctx.message.from ),
					text: '',
					isPrivate: ( ctx.chat.id > 0 ),
					extra: {
						username: ctx.message.from.username
					},
					handler: that,
					_rawdata: ctx
				} );

				if ( ctx.message.reply_to_message ) {
					const reply = ctx.message.reply_to_message;
					const replyTo = that._getNick( reply.from );
					const replyMessage = that._convertToText( reply );

					context.extra.reply = {
						nick: replyTo,
						username: reply.from.username,
						message: replyMessage,
						isText: reply.text && true
					};
				} else if ( ctx.message.forward_from ) {
					const fwd = ctx.message.forward_from;
					const fwdFrom = that._getNick( fwd );

					context.extra.forward = {
						nick: fwdFrom,
						username: fwd.username
					};
				}

				if ( ctx.message.text ) {
					if ( !context.text ) {
						context.text = ctx.message.text;
					}

					// 解析命令
					// eslint-disable-next-line prefer-const
					let [ , cmd, , param ] = ctx.message.text.match( /^\/([A-Za-z0-9_@]+)(\s+(.*)|\s*)$/u ) || [];
					if ( cmd ) {
						// 如果包含 Bot 名，判断是否为自己
						const [ , c, , n ] = cmd.match( /^([A-Za-z0-9_]+)(|@([A-Za-z0-9_]+))$/u ) || [];
						if ( ( n && ( n.toLowerCase() === String( that._username ).toLowerCase() ) ) || !n ) {
							param = param || '';

							context.command = c;
							context.param = param;

							if ( typeof that._commands.get( c ) === 'function' ) {
								that._commands.get( c )( context, c, param || '' );
							}

							that.emit( 'command', context, c, param || '' );
							that.emit( `command#${ c }`, context, param || '' );
						}
					}

					that.emit( 'text', context );
				} else {
					const message = ctx.message;
					const setFile = async ( msg:
						TT.PhotoSize & {
							mime_type: string
						} |
						TT.Sticker & {
							mime_type: string
						} |
						TT.Audio |
						TT.Voice |
						TT.Video |
						TT.Document,
					type: string ) => {
						context.extra.files = [ {
							client: 'Telegram',
							url: await that.getFileLink( msg.file_id ),
							type: type,
							id: msg.file_id,
							size: msg.file_size,
							mime_type: msg.mime_type
						} ];
					};

					if ( message.photo ) {
						let sz = 0;
						for ( const p of message.photo ) {
							if ( p.file_size > sz ) {
								await setFile( p, 'photo' );
								context.text = `<photo: ${ p.width }x${ p.height }, ${ getFriendlySize( p.file_size ) }>`;
								sz = p.file_size;
							}
						}

						if ( message.caption ) {
							context.text += ' ' + message.caption;
						}
						context.extra.isImage = true;
						context.extra.imageCaption = message.caption;
					} else if ( message.sticker ) {
						context.text = `${ message.sticker.emoji }<Sticker>`;
						await setFile( message.sticker, 'sticker' );
						context.extra.isImage = true;
					} else if ( message.audio ) {
						context.text = `<Audio: ${ message.audio.duration }", ${ getFriendlySize( message.audio.file_size ) }>`;
						await setFile( message.audio, 'audio' );
					} else if ( message.voice ) {
						context.text = `<Voice: ${ message.voice.duration }", ${ getFriendlySize( message.voice.file_size ) }>`;
						await setFile( message.voice, 'voice' );
					} else if ( message.video ) {
						context.text = `<Video: ${ message.video.width }x${ message.video.height }, ${ message.video.duration }", ${ getFriendlySize( message.video.file_size ) }>`;
						await setFile( message.video, 'video' );
					} else if ( message.document ) {
						context.text = `<File: ${ message.document.file_name }, ${ getFriendlySize( message.document.file_size ) }>`;
						await setFile( message.document, 'document' );
					} else if ( message.contact ) {
						context.text = `<Contact: ${ message.contact.first_name }, ${ message.contact.phone_number }>`;
					} else if ( message.location ) {
						context.text = `<Location: ${ getFriendlyLocation( message.location.latitude, message.location.longitude ) }>`;
					} else if ( message.venue ) {
						context.text = `<Venue: ${ message.venue.title }, ${ message.venue.address }, ${ getFriendlyLocation(
							message.venue.location.latitude, message.venue.location.longitude ) }>`;
					} else if ( message.pinned_message ) {
						if ( message.from.id === message.pinned_message.from.id ) {
							that.emit( 'pin', {
								from: {
									id: message.from.id,
									nick: that._getNick( message.from ),
									username: message.from.username
								},
								to: ctx.chat.id,
								text: that._convertToText( message.pinned_message )
							}, ctx );
						} else {
							context.text = `<Pinned Message: ${ that._convertToText( message.pinned_message ) }>`;
						}
					} else if ( message.left_chat_member ) {
						that.emit( 'leave', ctx.chat.id, {
							id: message.from.id,
							nick: that._getNick( message.from ),
							username: message.from.username
						}, {
							id: message.left_chat_member.id,
							nick: that._getNick( message.left_chat_member ),
							username: message.left_chat_member.username
						}, ctx );
					} else if ( message.new_chat_members ) {
						that.emit( 'join', ctx.chat.id, {
							id: message.from.id,
							nick: that._getNick( message.from ),
							username: message.from.username
						}, {
							id: message.new_chat_members[ 0 ].id,
							nick: that._getNick( message.new_chat_members[ 0 ] ),
							username: message.new_chat_members[ 0 ].username
						}, ctx );
					}

					if ( context.text ) {
						that.emit( 'richmessage', context );
					}
				}
			}
			return next();
		} );
	}

	public on( event: 'command', listener: ( context: Context, comand: string, param: string ) => void ): this;
	public on( event: 'text', listener: ( context: Context ) => void ): this;
	public on( event: 'pin', listener: ( info: {
		from: {
			id: number;
			nick: string;
			username?: string;
		},
		to: number;
		text: string;
	}, ctx: TContext ) => void ): this;
	public on( event: 'leave', listener: ( group: number, from: {
		id: number;
		nick: string;
		username?: string;
	}, target: {
		id: number;
		nick: string;
		username?: string;
	}, ctx: TContext ) => void ): this;
	public on( event: 'join', listener: ( group: number, from: {
		id: number;
		nick: string;
		username?: string;
	}, target: {
		id: number;
		nick: string;
		username?: string;
	}, ctx: TContext ) => void ): this;
	public on( event: 'richmessage', listener: ( context: Context ) => void ): this;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public on( event: string | symbol, listener: ( ...args: any[] ) => void ): this {
		return super.on( event, listener );
	}

	private _getNick( user: TT.User ): string {
		if ( user ) {
			const username = ( user.username || '' ).trim();
			const firstname = ( user.first_name || '' ).trim() || ( user.last_name || '' ).trim();
			const fullname = `${ user.first_name || '' } ${ user.last_name || '' }`.trim();

			if ( this._nickStyle === 'fullname' ) {
				return fullname || username;
			} else if ( this._nickStyle === 'firstname' ) {
				return firstname || username;
			} else {
				return username || fullname;
			}
		} else {
			return '';
		}
	}

	private _convertToText( message: TT.Message ) {
		if ( message.audio ) {
			return '<Audio>';
		} else if ( message.photo ) {
			return '<Photo>';
		} else if ( message.document ) {
			return '<Document>';
		} else if ( message.game ) {
			return '<Game>';
		} else if ( message.sticker ) {
			return `${ message.sticker.emoji }<Sticker>`;
		} else if ( message.video ) {
			return '<Video>';
		} else if ( message.voice ) {
			return '<Voice>';
		} else if ( message.contact ) {
			return '<Contact>';
		} else if ( message.location ) {
			return '<Location>';
		} else if ( message.venue ) {
			return '<Venue>';
		} else if ( message.pinned_message ) {
			return '<Pinned Message>';
		} else if ( message.new_chat_members ) {
			return '<New member>';
		} else if ( message.left_chat_member ) {
			return '<Removed member>';
		} else if ( message.text ) {
			return message.text;
		} else {
			return '<Message>';
		}
	}

	public get username(): string {
		return this._username;
	}

	public set username( v: string ) {
		this._username = v;
	}

	public get nickStyle(): string {
		return this._nickStyle;
	}

	public set nickStyle( v: string ) {
		this.nickStyle = v;
	}

	public addCommand( command: string, func?: Command ): this {
		// 自動過濾掉 command 中的非法字元
		const cmd = command.replace( /[^A-Za-z0-9_]/gu, '' );
		return super.addCommand( cmd, func );
	}

	public deleteCommand( command: string ): this {
		const cmd = command.replace( /[^A-Za-z0-9_]/gu, '' );
		return super.deleteCommand( cmd );
	}

	private async _say( method: string, target: string | number,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		message: any, options?: TT.ExtraReplyMessage ): Promise<any> {
		if ( !this._enabled ) {
			throw new Error( 'Handler not enabled' );
		} else {
			return await this._client.telegram[ method ]( target, message, options );
		}
	}

	public say( target: string | number, message: string, options?: TT.ExtraReplyMessage ): Promise<TT.Message> {
		return this._say( 'sendMessage', target, message, options );
	}

	public sayWithHTML( target: string | number, message: string,
		options?: TT.ExtraReplyMessage ): Promise<TT.Message> {
		const options2: TT.ExtraReplyMessage = copyObject( options );
		options2.parse_mode = 'HTML';
		return this.say( target, message, options2 );
	}

	public get sendPhoto(): Telegram[ 'sendPhoto' ] {
		return this._client.telegram.sendPhoto.bind( this._client.telegram );
	}

	public get sendAudio(): Telegram[ 'sendAudio' ] {
		return this._client.telegram.sendAudio.bind( this._client.telegram );
	}

	public get sendVideo(): Telegram[ 'sendVideo' ] {
		return this._client.telegram.sendVideo.bind( this._client.telegram );
	}

	public get sendAnimation(): Telegram[ 'sendAnimation' ] {
		return this._client.telegram.sendAnimation.bind( this._client.telegram );
	}

	public get sendDocument(): Telegram[ 'sendDocument' ] {
		return this._client.telegram.sendDocument.bind( this._client.telegram );
	}

	private async _reply( method: string, context: Context & { _rawdata: TContext },
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		message: any, options?: TT.ExtraReplyMessage ): Promise<any> {
		if ( ( context._rawdata && context._rawdata.message ) ) {
			if ( context.isPrivate ) {
				return await this._say( method, context.to, message, options );
			} else {
				const options2: TT.ExtraReplyMessage = copyObject( options );
				options2.reply_to_message_id = context._rawdata.message.message_id;
				return await this._say( method, context.to, message, options2 );
			}
		} else {
			throw new Error( 'No messages to reply' );
		}
	}

	public reply( context: Context & { _rawdata: TContext },
		message: string, options?: TT.ExtraReplyMessage ): Promise<TT.Message> {
		return this._reply( 'sendMessage', context, message, options );
	}

	public replyWithPhoto( context: Context & { _rawdata: TContext },
		photo: TT.InputFile, options?: TT.ExtraPhoto ): Promise<TT.MessagePhoto> {
		return this._reply( 'sendPhoto', context, photo, options );
	}

	public getChatAdministrators( group: string | number ): Promise<TT.ChatMember[]> {
		return this._client.telegram.getChatAdministrators( group );
	}

	public getFile( fileId: string ): Promise<TT.File> {
		return this._client.telegram.getFile( fileId );
	}

	public getFileLink( fileId: string ): Promise<string> {
		return this._client.telegram.getFileLink( fileId );
	}

	public leaveChat( chatId: string | number ): Promise<boolean> {
		return this._client.telegram.leaveChat( chatId );
	}

	public async start(): Promise<void> {
		if ( !this._started ) {
			this._started = true;

			if ( this._start.mode === 'webhook' ) {
				this._client.launch( {
					webhook: {
						hookPath: this._start.params.path,
						tlsOptions: this._start.params.tlsOptions,
						port: Number( this._start.params.port )
					}
				} );
			} else {
				this._client.launch( {
					polling: {
						timeout: this._start.params.timeout,
						limit: this._start.params.limit
					}
				} );
			}
		}
	}

	public async stop(): Promise<void> {
		if ( this._started ) {
			this._started = false;
			await this._client.stop();
		}
	}
}