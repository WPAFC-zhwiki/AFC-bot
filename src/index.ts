import moduleAlias from 'module-alias';
moduleAlias.addAliases( {
	src: __dirname,
	icg: __dirname + '/modules/icg'
} );

import 'src/modules/icg/index';
import 'src/modules/events';
import * as logger from 'src/modules/logger';

process.on( 'unhandledRejection', function ( _reason, promise ) {
	promise.catch( function ( e ) {
		logger.error( 'Unhandled Rejection: ', e );
	} );
} );

process.on( 'uncaughtException', function ( err ) {
	logger.error( 'Uncaught exception:', err );
} );

process.on( 'rejectionHandled', function () {
	// 忽略
} );

process.on( 'warning', ( warning ) => {
	logger.warn( warning );
} );
