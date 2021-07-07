const getBacklogInfo = require( process.cwd() + '/modules/backlogInfo.js' );

module.exports = {
	name: 'backlog',
	usage: 'backlog',
	aliases: [ '積壓', '积压' ],
	description: '查看積壓狀況',
	/**
	 * @type {import('../modules/command').run}
	 */
	run: async ( _client, _args, reply ) => {
		const { tMsg, dMsg } = await getBacklogInfo();

		reply( {
			tMsg,
			dMsg
		} );
	}
};
