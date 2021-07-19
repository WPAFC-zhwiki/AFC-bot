import { MessageHandler } from 'icg/handlers/MessageHandler';

let msgId = 0;

export type file = {
	/**
	 * 用於區分
	 */
	client: string;

	url?: string;
	path?: string;
	type: string;
	id: string;
	size: number;
	mime_type?: string;
};

export type extra = {
	/**
	 * 本次傳送有幾個群互聯？（由 bridge 發送）
	 */
	clients?: number;

	clientName?: {
		shortname: string;
		fullname: string;
	};
	/**
	 * 對應到目標群組之後的 to（由 bridge 發送）
	 */
	mapto?: string[];

	reply?: {
		nick: string;
		username: string;
		message: string;
		isText: boolean;
		discriminator?: string;
	};

	forward?: {
		nick: string;
		username: string;
	};

	files?: file[];

	username?: string;

	/**
	 * Telegram：檔案上傳用，由 bridge 發送
	 */
	uploads?: {
		url: string;
		type: 'photo' | 'audio' | 'file'
	}[];

	isImage?: boolean;

	imageCaption?: string;

	/**
	 * for irc
	 */
	isAction?: boolean;
};

export type optin = {
	from?: string | number;
	to?: string | number;
	nick?: string;
	text?: string;
	isPrivate?: boolean;
	extra?: extra;
	handler?: MessageHandler;
	_rawdata?: unknown;
	command?: string;
	param?: string;
}

function getMsgId(): number {
	msgId++;
	return msgId;
}

/**
 * Context 為統一格式的訊息上下文
 *
 * 訊息的完整格式設定：
 * ```
 * {
 *     from: "",
 *     to: "",
 *     nick: "",
 *     text: "",
 *     isPrivate: false,
 *     command: "",
 *     param: "",
 *     extra: {         // 備註：本程式為淺層拷貝
 *         clients: 3,  // 本次傳送有幾個群互聯？（由 bridge 發送）
 *         clientName: {
 *             shortname: ''
 *             fullname: ''
 *         }
 *         mapto: [     // 對應到目標群組之後的 to（由 bridge 發送）
 *             "irc/#aaa",
 *             ...
 *         ],
 *         reply: {
 *             nick: "",
 *             username: "",
 *             message: "",
 *             isText: true,
 *         },
 *         forward: {
 *             nick: "",
 *             username: "",
 *         },
 *         files: [
 *             {
 *                 client: "Telegram",  // 用於區分
 *                 type: ...
 *                 ...
 *             }
 *         ]
 *         uploads: [        // Telegram：檔案上傳用，由 bridge 發送
 *             {
 *                 url: "",
 *                 type: "photo"    // photo/audio/file
 *             }
 *         ],
 *     },
 *     handler: 訊息來源的 handler,
 *     _rawdata: 處理訊息的機器人所用的內部資料，應避免使用,
 * }
 * ```
 */
export class Context {
	protected _from: string = null;
	get from(): string {
		return this._from;
	}

	protected _to: string = null;
	get to(): string {
		return this._to;
	}

	public nick: string = null;

	public text = '';

	public isPrivate = false;

	public readonly isbot: boolean = false;

	public extra: extra = {};
	public readonly handler: MessageHandler = null;
	public _rawdata: unknown = null;
	public command = '';
	public param = '';

	private readonly _msgId: number = getMsgId();

	public constructor( options: optin = {}, overrides: optin = {} ) {
		// TODO 雖然這樣很醜陋，不過暫時先這樣了
		for ( const k of [ 'from', 'to' ] ) {
			if ( overrides[ k ] !== undefined ) {
				this[ `_${ k }` ] = overrides[ k ];
			} else if ( options[ k ] !== undefined ) {
				this[ `_${ k }` ] = options[ k ];
			}
		}

		for ( const k of [ 'nick', 'text', 'isPrivate', 'isbot', 'extra', 'handler', '_rawdata', 'command', 'param' ] ) {
			if ( overrides[ k ] !== undefined ) {
				this[ k ] = overrides[ k ];
			} else if ( options[ k ] !== undefined ) {
				this[ k ] = options[ k ];
			}
		}

		if ( options.text !== undefined ) {
			this.command = overrides.command || this.command || '';
			this.param = overrides.param || this.param || '';
		}
	}

	public say( target: string, message: string, options?: Record<string, string | boolean | number> ): void {
		if ( this.handler ) {
			this.handler.say( target, message, options );
		}
	}

	public reply( message: string, options?: Record<string, string | boolean | number> ): void {
		if ( this.handler ) {
			this.handler.reply( this, message, options );
		}
	}

	public get msgId(): number {
		return this._msgId;
	}
}