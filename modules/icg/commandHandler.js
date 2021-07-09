const { dcBot, tgBot, ircBot, chnList } = require( process.cwd() + '/util/bots' );

const logger = require(process.cwd() + '/modules/logger')

/**
 * @typedef {import('./command').reply} reply
 * @typedef {import('./command').command} command
 */

/**
 * @param {command} command
 */
function tgCommand( command ) {
  tgBot.telegram.setMyCommands( [ {
    command: command.name,
    description: command.description
  } ] );
  tgBot.command( command.name, function ( ctx ) {
    let args = ctx.message.text.split( ' ' );
    args.shift();
    command.run( { dcBot, tgBot, ircBot }, args,
      /**
       * @type {reply}
       */
      async function ( { tMsg, dMsg, iMsg }, iserror, eMsg ) {
        if ( iserror ) {
          ctx.reply( tMsg, {
            // eslint-disable-next-line camelcase
            parse_mode: 'HTML',
            // eslint-disable-next-line camelcase
            reply_to_message_id: ctx.message
          } ).catch( function () {
            ctx.reply( tMsg );
          } );
          return;
        }

        let m = await ctx.reply( tMsg, {
          // eslint-disable-next-line camelcase
          parse_mode: 'HTML',
          // eslint-disable-next-line camelcase
          disable_web_page_preview: true
        } );

        let dcChn, ircChn
        switch (ctx.chat.id) {
          case chnList.TGMAIN:
            dcChn = chnList.DCMAIN; ircChn = chnList.IRCMAIN; break;
          case chnList.TGREV:
            dcChn = chnList.DCREV; ircChn = chnList.IRCREV; break;
        }
        if ( dcChn ) {
          dcBot.channels.cache.get( dcChn ).send( dMsg );
        }
        if ( ircChn ) {
          ircBot.say( ircChn, iMsg );
        }

        return m
      } );
  } );
}

/**
 * @param {command} command
 */
function dcCommand( command ) {
  dcBot.on( 'message', function ( message ) {
    if ( typeof message.content !== 'string' || !message.content.startsWith( `/${ command.name }` ) ) {
      return;
    }
    let args = message.content.split( ' ' );
    args.shift();
    command.run( { dcBot, tgBot, ircBot }, args,
      /**
       * @type {reply}
       */
      async function ( { tMsg, dMsg, iMsg }, iserror, eMsg ) {
        if ( iserror ) {
          message.channel.send( dMsg );
          return;
        }
        let m = await message.channel.send( dMsg );

        let tgChn, ircChn
        switch (message.channel.id) {
          case chnList.DCMAIN:
            tgChn = chnList.TGMAIN; ircChn = chnList.IRCMAIN; break;
          case chnList.DCREV:
            tgChn = chnList.TGREV; ircChn = chnList.IRCREV; break;
        }
        if ( tgChn ) {
          tgBot.telegram.sendMessage( tgChn, tMsg, {
            // eslint-disable-next-line camelcase
            parse_mode: 'HTML',
            // eslint-disable-next-line camelcase
            disable_web_page_preview: true
          } );
        }
        if ( ircChn ) {
          ircBot.say( ircChn, iMsg );
        }

        return m
      } );
  } );
}

/**
 * @param {command} command
 */
function ircCommand( command ) {
  ircBot.on( 'message', function ( nick, to, text, message ) {
    message.content = message.args[1];
    message.channel = message.args[0];

    if ( typeof message.content !== 'string' || !message.content.startsWith( `!${ command.name }` ) ) {
      return;
    }
    let args = message.content.split( ' ' );
    args.shift();
    command.run( { dcBot, tgBot, ircBot }, args,
      /**
       * @type {reply}
       */
      async function ( { tMsg, dMsg, iMsg }, iserror, eMsg ) {
        if ( iserror ) {
          ircBot.say( message.channel, iMsg );
          return;
        }
        let m = ircBot.say( message.channel, iMsg );

        let tgChn, dcChn
        switch (message.channel) {
          case chnList.IRCMAIN:
            tgChn = chnList.TGMAIN; dcChn = chnList.DCMAIN; break;
          case chnList.IRCREV:
            tgChn = chnList.TGREV; dcChn = chnList.DCREV; break;
        }
        if ( tgChn ) {
          tgBot.telegram.sendMessage( tgChn, tMsg, {
            // eslint-disable-next-line camelcase
            parse_mode: 'HTML',
            // eslint-disable-next-line camelcase
            disable_web_page_preview: true
          } );
        }
        if ( dcChn ) {
          dcBot.channels.cache.get( dcChn ).send( dMsg );
        }

        return m
      } );
  } );
}

/**
 * @param {command} command
 */
function bindCommand( command ) {
  logger.info( `\x1b[33m[CMD]\x1b[0m Loading ${ command.name }` );
  dcCommand( command );
  tgCommand( command );
  ircCommand( command );
}

module.exports = {
  tgCommand,
  dcCommand,
  ircCommand,
  bindCommand
};
