import { MwnOptions } from 'mwn';
import { default as config, version, repository } from 'src/util/config';

export const DiscordBot = config.Discord.bot;
export const TelegramBot = config.Telegram.bot;
export const IRCBot = config.IRC.bot;
export const MWConfig: MwnOptions = config.afc.mwn;

if ( MWConfig.userAgent.length === 0 ) {
	MWConfig.userAgent = `AFC-ICG-BOT/${ version } (${ repository.url.replace( /^git\+/, '' ) })`;
}
