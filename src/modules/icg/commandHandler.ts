import { dcBot, tgBot, ircBot, chnList } from 'src/util/bots'
import * as logger from 'src/modules/logger'

import { Client as Discord, MessageEmbed as DiscordMessageEmbed } from 'discord.js';
import { Telegraf } from 'telegraf';
import { mwn } from 'mwn';
import { client, reply, run, command } from 'icg/command'

function tgCommand( command: command ) {
  tgBot.telegram.setMyCommands( [ {
    command: command.name,
    description: command.description
  } ] );
  tgBot.command( command.name, function ( ctx ) {
    let args = ctx.message.text.split( ' ' );
    args.shift();
    command.run( { dcBot, tgBot, ircBot }, args,
      async function ( { tMsg, dMsg, iMsg }, iserror, eMsg ) {
        if ( iserror ) {
          ctx.reply( tMsg, {
            parse_mode: 'HTML'
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

        let dcChn: string, ircChn: string
        switch (ctx.chat.id) {
          case chnList.TGMAIN:
            dcChn = chnList.DCMAIN; ircChn = chnList.IRCMAIN; break;
          case chnList.TGREV:
            dcChn = chnList.DCREV; ircChn = chnList.IRCREV; break;
        }
        if ( dcChn ) {
          let dC = dcBot.channels.cache.get( dcChn )
          if (dC.isText()) dC.send( dMsg );
        }
        if ( ircChn ) {
          ircBot.say( ircChn, iMsg );
        }

        return m
      } );
  } );
}

function dcCommand( command: command ) {
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

        let tgChn: number, ircChn: string
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

function ircCommand( command: command ) {
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

        let tgChn: number, dcChn: string
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
          let dC = dcBot.channels.cache.get( dcChn )
          if ( dC.isText() ) dC.send( dMsg );
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

export {
  tgCommand,
  dcCommand,
  ircCommand,
  bindCommand
};
