const { CronJob } = require( 'cron' )
    , getBacklogInfo = require( process.cwd() + '/modules/backlogInfo.js' );

const logger = require( process.cwd() + '/modules/logger' )

module.exports = {
  name: 'backlog',
  fire: async ( send ) => {
    let backlogNotif = new CronJob( '0 0 */4 * * *', async () => {
      try {
        const { tMsg, dMsg } = await getBacklogInfo();

        send( {
          tMsg,
          dMsg
        } );

      } catch ( err ) {
        logger.error( err );
      }
    } );
    backlogNotif.start();
  }
};
