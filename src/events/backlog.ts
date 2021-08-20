import { CronJob } from 'cron';
import getBacklogInfo from 'src/modules/backlogInfo';

import * as logger from 'src/modules/logger';

import { event } from 'src/modules/events';

const Event: event = {
	name: 'backlog',
	fire: async ( send ) => {
		const backlogNotif = new CronJob( '0 0 */4 * * *', async () => {
			try {
				const { tMsg, dMsg, iMsg } = await getBacklogInfo();

				send( {
					tMsg,
					dMsg,
					iMsg
				} );

			} catch ( err ) {
				logger.error( err );
			}
		} );
		backlogNotif.start();
	}
};

export { Event };
