import getBacklogInfo from 'src/modules/backlogInfo'

import { command } from 'icg/command'

const Command: command = {
  name: 'backlog',
  usage: 'backlog',
  aliases: [ '積壓', '积压' ],
  description: '查看積壓狀況',
  run: async ( _client, _args, reply ) => {
    const { tMsg, dMsg, iMsg } = await getBacklogInfo();

    reply( {
      tMsg,
      dMsg,
      iMsg
    } );
  }
};

export default Command;