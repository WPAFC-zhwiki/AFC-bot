const fs = require('fs')
const { dcBot, tgBot, chnList } = require( process.cwd() + '/util/bots' );

const logger = require(process.cwd() + '/modules/logger')

function bindEvent( event ) {
	logger.info( `\x1b[33m[EVT]\x1b[0m Loading ${ event.name }` );
	event.fire( function ( { tMsg, dMsg } ) {
		dcBot.channels.cache.get( chnList.DCREV ).send( dMsg );
		tgBot.telegram.sendMessage( chnList.TGREV , tMsg , {
			// eslint-disable-next-line camelcase
			parse_mode: 'Markdown',
			// eslint-disable-next-line camelcase
			disable_web_page_preview: true
		} );
	} );
}

logger.bot( 'Loading events:' );

const eventFiles = fs
	.readdirSync( process.cwd() + '/events' )
	.filter( ( file ) => file.endsWith( '.js' ) );

for ( const file of eventFiles ) {
	const event = require( process.cwd() + `/events/${ file }` );
	bindEvent( event );
}