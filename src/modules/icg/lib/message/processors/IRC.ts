import { Manager } from 'icg/init';
import { IMessage } from 'irc-upd';
import { Context } from 'icg/lib/handlers/Context';
import msgManage from 'icg/lib/message/msgManage';

const ircHandler = Manager.handlers.get( 'IRC' );

ircHandler.on( 'text', function ( context: Context<IMessage> ) {
	msgManage.emit( 'irc', context.from, context.to, context.text, context );
} );
