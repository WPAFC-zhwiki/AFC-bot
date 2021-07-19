import { MwnOptions } from 'mwn'

export const DiscordToken = process.env.DISCORD_BOT_TOKEN
export const TelegramToken = process.env.TELEGRAM_BOT_TOKEN
export const IRCPassword = process.env.IRC_BOT_PW
export const MWConfig: MwnOptions = {
  username: "LuciferianBot@AFCHBot2.0",
  password: process.env.WIKIBOTPW,
  userAgent: "ZHAFC/2.0 (https://github.com/WPAFC-zhwiki/ICG-Bot)"
}