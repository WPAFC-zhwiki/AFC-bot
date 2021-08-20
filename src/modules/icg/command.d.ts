import { Client as Discord, MessageEmbed as DiscordMessageEmbed } from 'discord.js';
import { Telegraf, Context as TContext } from 'telegraf';
import { mwn } from 'mwn';
import irc from 'irc-upd';

export type client = {
	dcBot?: Discord;
	tgBot?: Telegraf<TContext>;
	ircBot?: irc.Client;
	mwBot?: mwn;
};

export type reply = ( msg: {
	tMsg: string;
	dMsg: string | DiscordMessageEmbed;
	iMsg: string;
}, iserror?: boolean, eMsg?: string ) => void;

// eslint-disable-next-line no-shadow
export type run = ( client: client, args: string[], reply: reply ) => void;

export type command = {
	name: string;
	usage: string;
	aliases: string[];
	description: string;
	run: run;
};

// eslint-disable-next-line no-shadow
export function dcCommand( command: command ): void;
// eslint-disable-next-line no-shadow
export function tgCommand( command: command ): void;
// eslint-disable-next-line no-shadow
export function ircCommand( command: command ): void;

// eslint-disable-next-line no-shadow
export function bindCommand( command: command ): void;
