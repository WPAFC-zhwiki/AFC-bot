export { default as hook } from 'icg/lib/message/msgManage';
export * from 'icg/lib/message/command';
export * from 'icg/lib/message/uid';
import { Manager } from 'icg/init';
import * as logger from 'src/modules/logger';

for ( const [ type ] of Manager.handlers ) {
	require( `./processors/${ type }` );
	logger.debug( `[message] load processor ${ type }` );
}
