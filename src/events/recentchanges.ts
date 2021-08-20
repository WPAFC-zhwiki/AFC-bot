import { recentChange } from 'src/util/bots';

import { event } from 'src/modules/events';

const Event: event = {
	name: 'recentchanges',
	fire: async () => {
		recentChange( ( data ) => {
			return (
				data.wiki === 'zhwiki'
			);
		}, async () => {
			return;
		} );
	}
};

export { Event };
