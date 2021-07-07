const { Telegraf: TelegramClient } = require('telegraf')
    , { 
      Client: DiscordClient,
      Intents: DiscordIntents,
      Collection: DiscordCollection
    } = require('discord.js')
    , { DiscordToken, TelegramToken, WikiToken } = require('./credentials')
    , config = require('./config.json')
    , logger = require(process.cwd() + '/modules/logger.js')
    , { mwn } = require("mwn")

const intents = new DiscordIntents();
intents.add(
  'GUILDS', 'GUILD_MEMBERS', 'GUILD_BANS', 'GUILD_EMOJIS', 'GUILD_WEBHOOKS', 'GUILD_INVITES',
  'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILD_MESSAGE_TYPING', 'DIRECT_MESSAGES',
  'DIRECT_MESSAGE_REACTIONS', 'DIRECT_MESSAGE_TYPING'
)

const dcBot = new DiscordClient( { intents } )
		, tgBot = new TelegramClient( TelegramToken )

dcBot.login(DiscordToken).catch(e => {
  logger.error("\x1b[31m[Discord]\x1b[0m Error:", e)
})

dcBot.once("ready", () => {
  logger.success(
    `\x1b[35m[Discord]\x1b[0m login as ${""
    }${dcBot.user.tag} (${dcBot.user.id})`
  )
})

dcBot.commands = new DiscordCollection()

tgBot.telegram.getMe().then(me => {
	logger.success( `\x1b[36m[Telegram]\x1b[0m login as ${ me.first_name }${ me.last_name || '' }@${ me.username } (${ me.id })` );
}).catch(e => {
	logger.error( '\x1b[36m[Telegram]\x1b[0m Telegraf.telegram.getMe() fail', e );
	return null;
})

tgBot.launch().then(() => {
	logger.success( '\x1b[36m[Telegram]\x1b[0m launch......' );
}).catch(e => {
	logger.error( '\x1b[36m[Telegram]\x1b[0m Error:', e );
});

module.exports = {
	dcBot,
	tgBot,
	chnList: {
    DCREV: config.DCREV,
	  TGREV: config.TGREV,
    // IRCCHN: config.IRCCHN
    DCMAIN: config.DCMAIN,
    TGMAIN: config.TGMAIN,
  },
};

(async () => {
  let optin = require('./credentials.js');
  Object.assign(optin.mwn, {
    apiUrl: 'https://zh.wikipedia.org/w/api.php',
    defaultParams: {
      assert: 'user'
    }
  });
  const mwBot = new mwn(optin.mwn);
  if (optin.mwn.OAuthCredentials) {
    mwBot.getTokensAndSiteInfo();
  } else {
    mwBot.login();
  }
  module.exports.mwBot = mwBot;
})()