import { Manager } from 'icg/init';
import { Context } from 'icg/lib/handlers/Context';
import { TelegrafContext as TContext } from 'telegraf/typings/context';
import msgManage from 'icg/lib/message/msgManage';

const tgHandler = Manager.handlers.get( 'Telegram' );

tgHandler.on( 'text', function ( context: Context<TContext> ) {
	msgManage.emit( 'telegram', context.from, context.to, context.text, context );
} );
