/*
 * 在 Telegram 群組中取得群組的 ID，以便於配置互聯機器人
 */

import * as logger from 'src/modules/logger'
import { Manager } from 'icg/main';

const tg = Manager.handlers.get( 'Telegram' );
if ( tg ) {
	tg.addCommand( 'thisgroupid', ( context ) => {
		if ( context.isPrivate ) {
			context.reply( `YourId = ${ context.from }` );
			logger.debug( `[groupid-tg.js] Msg #${ context.msgId }: YourId = ${ context.from }` );
		} else {
			context.reply( `GroupId = ${ context.to }` );
			logger.debug( `[groupid-tg.js] Msg #${ context.msgId }: GroupId = ${ context.to }` );
		}
	} );
}