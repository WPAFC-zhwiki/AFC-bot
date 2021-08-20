import * as logger from 'src/modules/logger';
import { Manager } from 'icg/init';
import * as bridge from 'icg/transport/bridge';
import { ConfigTS } from 'src/util/config';
import { BridgeMsg } from 'icg/transport/BridgeMsg';

bridge.addHook( 'bridge.send', function ( msg: BridgeMsg ) {
	return new Promise<void>( function ( resolve, reject ) {
		const paeeye: ConfigTS[ 'transport' ][ 'options' ][ 'paeeye' ] = Manager.config.transport.options.paeeye;

		if ( (
			paeeye.prepend.length && msg.text.startsWith( paeeye.prepend ) ||
		paeeye.inline.length && msg.text.includes( paeeye.inline ) ||
		paeeye.regexp && msg.text.match( paeeye.regexp )
		) ) {
			logger.debug( `[transport/paeeye] #${ msg.msgId }: Ignored.` );
			reject( false );
			return;
		} else if (
			msg.extra.reply &&
		(
			paeeye.prepend.length && msg.extra.reply.message.startsWith( paeeye.prepend ) ||
			paeeye.inline.length && msg.extra.reply.message.includes( paeeye.inline ) ||
			paeeye.regexp && msg.extra.reply.message.match( paeeye.regexp )
		)
		) {
			logger.debug( `[transport/paeeye] #${ msg.msgId }: Ignored.` );
			reject( false );
			return;
		}

		resolve();
	} );
} );
