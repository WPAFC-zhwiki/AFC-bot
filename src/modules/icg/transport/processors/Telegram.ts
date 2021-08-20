import path from 'path';
import { Manager } from 'icg/init';
import * as bridge from 'icg/transport/bridge';
import { ConfigTS } from 'src/util/config';
import { BridgeMsg } from 'icg/transport/BridgeMsg';
import format from 'string-format';
import { Context } from 'icg/lib/handlers/Context';
import { TelegrafContext as TContext } from 'telegraf/typings/context';
import jQuery from 'src/modules/jquery';
import msgManage from 'icg/lib/message/msgManage';
import * as logger from 'src/modules/logger';

function htmlEscape( str: string ): string {
	return jQuery( '<div>' ).text( str ).html();
}

function truncate( str: string, maxLen = 20 ) {
	str = str.replace( /\n/gu, '' );
	if ( str.length > maxLen ) {
		str = str.substring( 0, maxLen - 3 ) + '...';
	}
	return str;
}

const config: ConfigTS[ 'transport' ] = Manager.config.transport;
const tgHandler = Manager.handlers.get( 'Telegram' );

const options: ConfigTS[ 'transport' ][ 'options' ][ 'Telegram' ] = config.options.Telegram;

const forwardBots: Record<string, '[]' | '<>' | 'self'> = options.forwardBots;

// 我們自己也是傳話機器人
forwardBots[ tgHandler.username ] = 'self';

// 如果是互聯機器人，那麼提取真實的使用者名稱和訊息內容
function parseForwardBot( username: string, text: string ) {
	let realText: string, realNick: string;
	const symbol = forwardBots[ username ];
	if ( symbol === 'self' ) {
		// TODO 更換匹配方式
		// [ , , realNick, realText ] = text.match(/^(|<.> )\[(.*?)\] ([^]*)$/mu) || [];
		[ , realNick, realText ] = text.match( /^\[(.*?)\] ([^]*)$/mu ) || [];
	} else if ( symbol === '[]' ) {
		[ , realNick, realText ] = text.match( /^\[(.*?)\](?::? |\n)([^]*)$/mu ) || [];
	} else if ( symbol === '<>' ) {
		[ , realNick, realText ] = text.match( /^<(.*?)>(?::? |\n)([^]*)$/mu ) || [];
	}

	return { realNick, realText };
}

msgManage.on( 'telegram', async function ( _from, _to, _text, context ) {
	const extra = context.extra;
	if ( context.text.match( /^\/([A-Za-z0-9_@]+)(\s+(.*)|\s*)$/u ) && !options.forwardCommands ) {
		return;
	}

	// 檢查是不是自己在回覆自己，然後檢查是不是其他互聯機器人在說話
	if ( extra.reply && forwardBots[ extra.reply.username ] ) {
		const { realNick, realText } = parseForwardBot( extra.reply.username, extra.reply.message );
		if ( realNick ) {
			[ extra.reply.nick, extra.reply.message ] = [ realNick, realText ];
		}
	} else if ( extra.forward && forwardBots[ extra.forward.username ] ) {
		const { realNick, realText } = parseForwardBot( extra.forward.username, context.text );
		if ( realNick ) {
			[ extra.forward.nick, context.text ] = [ realNick, realText ];
		}
	}

	try {
		await bridge.send( context );
	} catch ( e ) {
		logger.error( e instanceof Error ? e.stack : e );
	}
} );

tgHandler.on( 'richmessage', ( context: Context ) => {
	const extra = context.extra;

	// 檢查是不是在回覆互聯機器人
	if ( extra.reply && forwardBots[ extra.reply.username ] ) {
		const { realNick, realText } = parseForwardBot( extra.reply.username, extra.reply.message );
		if ( realNick ) {
			[ extra.reply.nick, extra.reply.message ] = [ realNick, realText ];
		}
	}

	bridge.send( context ).catch( function ( err ) {
		throw err;
	} );
} );

// Pinned message
tgHandler.on( 'pin', ( info: {
	from: {
		id: number;
		nick: string;
		username?: string;
	};
	to: number;
	text: string;
}, ctx: TContext ) => {
	if ( options.notify.pin ) {
		bridge.send( new BridgeMsg( {
			from: info.from.id,
			to: info.to,
			nick: info.from.nick,
			text: `${ info.from.nick } pinned: ${ info.text.replace( /\n/gu, ' ' ) }`,
			isNotice: true,
			handler: tgHandler,
			_rawdata: ctx
		} ) ).catch( function ( err ) {
			throw err;
		} );
	}
} );

// 加入與離開
tgHandler.on( 'join', ( group: number, from: {
	id: number;
	nick: string;
	username?: string;
}, target: {
	id: number;
	nick: string;
	username?: string;
}, ctx: TContext ) => {
	let text: string;
	if ( from.id === target.id ) {
		text = `${ target.nick } 加入群組`;
	} else {
		text = `${ from.nick } 邀請 ${ target.nick } 加入群組`;
	}

	if ( options.notify.join ) {
		bridge.send( new BridgeMsg<TContext>( {
			from: target.id,
			to: group,
			nick: target.nick,
			text: text,
			isNotice: true,
			handler: tgHandler,
			_rawdata: ctx
		} ) ).catch( function ( err ) {
			throw err;
		} );
	}
} );

tgHandler.on( 'leave', ( group: number, from: {
	id: number;
	nick: string;
	username?: string;
}, target: {
	id: number;
	nick: string;
	username?: string;
}, ctx: TContext ) => {
	let text: string;
	if ( from.id === target.id ) {
		text = `${ target.nick } 離開群組`;
	} else {
		text = `${ target.nick } 被 ${ from.nick } 移出群組`;
	}

	if ( options.notify.leave ) {
		bridge.send( new BridgeMsg( {
			from: target.id,
			to: group,
			nick: target.nick,
			text: text,
			isNotice: true,
			handler: tgHandler,
			_rawdata: ctx
		} ) ).catch( function ( err ) {
			throw err;
		} );
	}
} );

// 收到了來自其他群組的訊息
export default async function ( msg: BridgeMsg, { withNick, isNotice }: { withNick: boolean, isNotice: boolean } = {
	withNick: true,
	isNotice: false
} ): Promise<void> {
	// 元信息，用于自定义样式
	const meta: Record<string, string> = {
		nick: `<b>${ htmlEscape( msg.nick ) }</b>`,
		from: htmlEscape( msg.from ),
		to: htmlEscape( msg.to ),
		text: htmlEscape( msg.text ),
		client_short: htmlEscape( msg.extra.clientName.shortname ),
		client_full: htmlEscape( msg.extra.clientName.fullname ),
		command: htmlEscape( msg.command ),
		param: htmlEscape( msg.param )
	};
	if ( msg.extra.reply ) {
		const reply = msg.extra.reply;
		meta.reply_nick = reply.nick;
		meta.reply_user = reply.username;
		if ( reply.isText ) {
			meta.reply_text = truncate( reply.message );
		} else {
			meta.reply_text = reply.message;
		}
	}
	if ( msg.extra.forward ) {
		meta.forward_nick = msg.extra.forward.nick;
		meta.forward_user = msg.extra.forward.username;
	}

	// 自定义消息样式
	let styleMode: 'simple' | 'complex' = 'simple';
	const messageStyle = config.options.messageStyle;
	if ( /* msg.extra.clients >= 3 && */( msg.extra.clientName.shortname || isNotice ) ) {
		styleMode = 'complex';
	}

	let template: string;
	if ( isNotice ) {
		template = messageStyle[ styleMode ].notice;
	} else if ( msg.extra.isAction ) {
		template = messageStyle[ styleMode ].action;
	} else if ( msg.extra.reply ) {
		template = messageStyle[ styleMode ].reply;
	} else if ( msg.extra.forward ) {
		template = messageStyle[ styleMode ].forward;
	} else if ( !withNick ) {
		template = '{text}';
	} else {
		template = messageStyle[ styleMode ].message;
	}

	template = htmlEscape( template );
	const output = format( template, meta );
	const to = BridgeMsg.parseUID( msg.to_uid ).id;
	const newRawMsg = await tgHandler.sayWithHTML( to, output );

	// 如果含有相片和音訊
	if ( msg.extra.uploads ) {
		const replyOption = {
			reply_to_message_id: newRawMsg.message_id
		};

		for ( const upload of msg.extra.uploads ) {
			if ( upload.type === 'audio' ) {
				await tgHandler.sendAudio( to, upload.url, replyOption );
			} else if ( upload.type === 'photo' ) {
				if ( path.extname( upload.url ) === '.gif' ) {
					await tgHandler.sendAnimation( to, upload.url, replyOption );
				} else {
					await tgHandler.sendPhoto( to, upload.url, replyOption );
				}
			} else {
				await tgHandler.sendDocument( to, upload.url, replyOption );
			}
		}
	}
}
