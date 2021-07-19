import { Telegraf as TelegramClient } from 'telegraf'
import {
  Client as DiscordClient
  , Intents as DiscordIntents
  , Collection as DiscordCollection
} from 'discord.js'
import IRC from 'irc'
import irc = require( 'irc-upd' )
import { mwn } from 'mwn'
class mwClient extends mwn {
  plogin: Promise<any>
}

import { DiscordToken, TelegramToken, IRCPassword, MWConfig } from 'src/util/credentials'

import config from 'src/util/config.json'
import * as logger from 'src/modules/logger'
import * as fn from 'src/util/fn'

const intents = new DiscordIntents()
intents.add(
  'GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS', 'GUILD_WEBHOOKS', 'GUILD_INVITES',
  'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING', 'DIRECT_MESSAGES',
  'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING'
)

const dcBot = new DiscordClient( { ws: { intents } } )
    , tgBot = new TelegramClient( TelegramToken )

dcBot.login( DiscordToken ).catch( e => {
  logger.error("\x1b[31m[DC]\x1b[0m Error:", e)
})

dcBot.once( "ready", () => {
  logger.success(
    `\x1b[35m[DC]\x1b[0m login as ${""
    }${dcBot.user.tag} (${dcBot.user.id})`
  )
} )

tgBot.telegram.getMe().then( me => {
  logger.success( `\x1b[36m[TG]\x1b[0m login as ${ me.first_name }${ me.last_name || '' }@${ me.username } (${ me.id })` );
} ).catch( e => {
  logger.error( '\x1b[36m[TG]\x1b[0m Telegraf.telegram.getMe() fail', e );
  return null;
} )

tgBot.launch().then( () => {
  logger.success( '\x1b[36m[TG]\x1b[0m launch......' );
} ).catch( e => {
  logger.error( '\x1b[36m[TG]\x1b[0m Error:', e );
} );

const ircBot: IRC.Client = new irc.Client( "irc.libera.chat", "zhwp-afc-bot", {
  userName: "zhwp-afc-bot",
  realName: "zhwp-afc-bot",
  port: 6666,
  autoRejoin: true,
  channels: ["#wikipedia-zh-afc", "#wikipedia-zh-afc-reviewer"],
  secure: false,
  floodProtection: true,
  floodProtectionDelay: 300,
  sasl: true,
  password: IRCPassword,
  encoding: 'UTF-8',
  autoConnect: false,
} );

ircBot.connect(() => {
  logger.success( `\x1b[92m[IRC]\x1b[0m login as ${ircBot.opt.userName}` );
})

export {
  dcBot,
  tgBot,
  ircBot,
};
export const chnList = {
  DCREV: config.DCREV,
  TGREV: config.TGREV,
  DCMAIN: config.DCMAIN,
  TGMAIN: config.TGMAIN,
  IRCMAIN: config.IRCMAIN,
  IRCREV: config.IRCREV
};

Object.assign( MWConfig, {
  apiUrl: 'https://zh.wikipedia.org/w/api.php',
  defaultParams: { assert: 'user' }
} );
const mwBot = new mwClient( MWConfig );
let loggedIn = mwBot.login();
mwBot.plogin = loggedIn;
export { mwBot };

// export const mwStream = (() => {
//   logger.info( "Preparing EventSource... ")
//   let stream = new mwBot.stream( "recentchange", {
//     onopen: () => { logger.success( "EventSource online." ) },
//     onerror: ( err ) => { logger.error( "EventSource:", err ) }
//   } );
//   return stream
// })();