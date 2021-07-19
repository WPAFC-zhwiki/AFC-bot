/*
 * @name 使用通用介面處理 Discord 訊息
 */

import { MessageHandler } from 'icg/handlers/MessageHandler'
import { Context } from 'icg/handlers/Context'
import Discord from 'discord.js';
import { getFriendlySize } from 'icg/util'

import { dcBot } from 'src/util/bots';

import { ConfigTS } from 'src/util/type';

export class DiscordMessageHandler extends MessageHandler {
	private readonly _token: string;
	protected readonly _client: Discord.Client;
	protected readonly _type = 'Discord';
	protected readonly _id = 'D';

	private readonly _nickStyle: 'nickname' | 'username' | 'fullname' | 'firstname';
	public readonly useProxyURL: boolean = false;
	public readonly relayEmoji: boolean = false;

  public constructor( config: ConfigTS[ 'Discord' ] ) {
    super( config );

    const client = dcBot
    const discordOptions: ConfigTS[ 'Discord' ][ 'options' ] = config.options;

    this._type = 'Discord';
    this._id = 'D';
    this._token = dcBot.token
    this._client = dcBot
		this._nickStyle = discordOptions.nickStyle || 'username';
		this.useProxyURL = discordOptions.useProxyURL;
		this.relayEmoji = discordOptions.relayEmoji;

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const that = this;

		const processMessage = async function ( rawdata: Discord.Message ): Promise<void> {
			if (
				!that._enabled ||
				rawdata.author.id === client.user.id ||
				discordOptions.ignorebot && rawdata.author.bot ||
				discordOptions.ignore.includes( rawdata.author.id )
			) {
				return;
			}

			let text = rawdata.content;
			const extra: {
				files?: {
					client: 'Discord',
					type: string,
					id: string,
					size: number,
					url: string
				} [];
				reply?: {
					nick: string;
					username: string;
					discriminator: string;
					message: string;
					isText: boolean;
					_rawdata: Discord.Message
				}
			} = {};

			if ( rawdata.attachments && rawdata.attachments.size ) {
				extra.files = [];
				for ( const [ , p ] of rawdata.attachments ) {
					extra.files.push( {
						client: 'Discord',
						type: 'photo',
						id: p.id,
						size: p.size,
						url: that.useProxyURL ? p.proxyURL : p.url
					} );
					text += ` <photo: ${ p.width }x${ p.height }, ${ getFriendlySize( p.size ) }>`;
				}
			}

			if ( rawdata.reference && rawdata.reference.messageID ) {
				if ( rawdata.channel.id === rawdata.reference.channelID ) {
					const msg = await rawdata.channel.messages.fetch( rawdata.reference.messageID );
					const reply = {
						nick: that.getNick( msg.member || msg.author ),
						username: msg.author.username,
						discriminator: msg.author.discriminator,
						message: that._convertToText( msg ),
						isText: msg.content && true,
						_rawdata: msg
					};

					extra.reply = reply;
				}
			}

			const context = new Context( {
				from: rawdata.author.id,
				to: rawdata.channel.id,
				nick: that.getNick( rawdata.member || rawdata.author ),
				text: text,
				isPrivate: rawdata.channel.type === 'dm',
				extra: extra,
				handler: that,
				_rawdata: rawdata
			} );

			// 檢查是不是命令
			for ( const [ cmd, callback ] of that._commands ) {
				if ( rawdata.content.startsWith( cmd ) ) {
					let param = rawdata.content.trim().substring( cmd.length );
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
		};

		client.on( 'message', processMessage );

		client.on( 'ready', function () {
			// eslint-disable-next-line prefer-rest-params
			that.emit( 'ready', arguments[ 0 ] );
		} );
	}

	public on( event: 'command', listener: ( context: Context, comand: string, param: string ) => void ): this;
	public on( event: 'text', listener: ( context: Context ) => void ): this;
	public on( event: 'ready', listener: ( client: Discord.Client ) => void ): this;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public on( event: string | symbol, listener: ( ...args: any[] ) => void ): this {
		return super.on( event, listener );
	}

	public async say( target: string, message: string | Discord.MessageEmbed ): Promise<Discord.Message> {
		if ( !this._enabled ) {
			throw new Error( 'Handler not enabled' );
		} else {
			const channel: Discord.TextChannel = Object.assign( await this._client.channels.fetch( target ) );
			if ( typeof channel.send !== 'function' ) {
				throw new Error( `Channel ${ target } is not't a text channel.` );
			}
			return await channel.send( message );
		}
	}

	public async reply( context: Context, message: string | Discord.MessageEmbed, options: {
		noPrefix?: boolean
	} ): Promise<Discord.Message> {
		if ( context.isPrivate ) {
			return await this.say( String( context.from ), message );
		} else {
			if ( options.noPrefix ) {
				return await this.say( String( context.to ), `${ message }` );
			} else {
				return await this.say( String( context.to ), `${ context.nick }: ${ message }` );
			}
		}
	}

	public getNick( userobj: Discord.GuildMember | {
		username: string;
		id: string;
	} ): string {
		if ( userobj ) {
			let nickname: string, id: string, username: string;
			if ( userobj instanceof Discord.GuildMember ) {
				nickname = userobj.nickname;
				id = userobj.id;
				const user = userobj.user;
				username = user.username;
			} else {
				username = userobj.username;
				id = userobj.id;
				nickname = null;
			}

			if ( this._nickStyle === 'nickname' ) {
				return nickname || username || id;
			} else if ( this._nickStyle === 'username' ) {
				return username || id;
			} else {
				return id;
			}
		} else {
			return '';
		}
	}

	public async fetchUser( user: string ): Promise<Discord.User> {
		return await this._client.users.fetch( user );
	}

	public fetchEmoji( emoji: Discord.EmojiResolvable ): Discord.GuildEmoji {
		return this._client.emojis.resolve( emoji );
	}

	private _convertToText( message: Discord.Message ): string {
		if ( message.content ) {
			return message.content;
		} else if ( message.attachments ) {
			return '<Photo>';
		} else {
			return '<Message>';
		}
	}

	public async start(): Promise<void> {
		if ( !this._started ) {
			this._started = true;
			this._client.login( this._token );
		}
	}

	public async stop(): Promise<void> {
		if ( this._started ) {
			this._started = false;
			this._client.destroy();
		}
	}
}