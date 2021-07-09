/* eslint-disable no-shadow, no-unused-vars */
import { Client as Discord, MessageEmbed as DiscordMessageEmbed } from 'discord.js';
import { Telegraf } from 'telegraf';
import { mwn } from 'mwn';

export type client = {
  dcBot: Discord;
  tgBot: Telegraf;
  mwBot: mwn;
};

export type reply = ( msg: {
  tMsg: string;
  dMsg: string | DiscordMessageEmbed;
}, iserror:boolean ) => void;

export type run = ( client: client, args: string[], reply: reply ) =>void;

export type command = {
  name: string;
  usage: string;
  description: string;
  run: run;
};

export function dcCommand( command: command ): void;
export function tgCommand( command: command ): void;
export function ircCommand( command: command ): void;

export function bindCommand( command: command ): void;
