import { MessageEmbed as DiscordMessageEmbed } from 'discord.js';
import $ from 'src/modules/jquery';

import * as logger from 'src/modules/logger';
import * as fn from 'src/util/fn';

const { iB } = fn;

import { mwBot } from 'src/util/bots';

import { event } from 'src/modules/events';

const Event: event = {
	name: 'helpdesk',
	fire: async ( send ) => {
		const stream = new mwBot.stream( 'recentchange', {
			onopen: () => { logger.success( 'EventSource online.' ); },
			onerror: ( err ) => { logger.error( 'EventSource:', err ); }
		} );
		stream.addListener( ( data ) => {
			return (
				data.wiki === 'zhwiki' &&
        data.title === 'WikiProject:建立條目/詢問桌' &&
        ( data.length?.old || 11 ) < ( data.length?.new || 0 ) + 10
			);
		}, async ( data ) => {
			const { compare } = await mwBot.request( {
				action: 'compare',
				format: 'json',
				fromrev: data.revision.old,
				torev: data.revision.new
			} );
			const $diff = $( '<table>' ).append( compare.body );
			let diffText = '';
			$diff.find( '.diff-addedline' ).each( ( _i, ele ) => {
				diffText += $( ele ).text() + '\n';
			} );

			const parse = await mwBot.parseWikitext( diffText );
			const $parse = $( parse );
			$parse.find( 'a' ).each( function ( _i, a ) {
				const $a: JQuery<HTMLAnchorElement> = $( a );
				const url = new URL( $a.attr( 'href' ), 'https://zh.wikipedia.org/WikiProject:建立條目/詢問桌' );
				$a.text( `<a href="${ url.href }">${ $a.text() }</a>` );
			} );
			const parseHTML = $parse.text();
			const parseMD = fn.turndown( parseHTML );
			const parseIRC = parseHTML
				.replace( /<a href="([^"]+)">([^<]+)<\/a>/g, function ( _all: string, href: string, txt: string ) {
					href = href.trim().replace( /^https:\/\/zh\.wikipedia\.org\/(wiki\/)?/g, 'https://zhwp.org/' );
					return ` ${ txt } <${ decodeURI( href ) }>`;
				} )
				.replace( /https:\/\/zh\.wikipedia\.org\/(wiki\/)?/g, 'https://zhwp.org/' )
				.replace( /<b>(.*?)<\/b>/g, `${ iB }$1${ iB }` );

			const dMsg = new DiscordMessageEmbed()
				.setColor( 'BLUE' )
				.setTitle( '詢問桌有新留言！' )
				.setURL( 'https://zhwp.org/WikiProject:建立條目/詢問桌' )
				.setDescription(
					`留言者：[${ data.user }](https://zhwp.org/User:${ fn.eURIC(
						data.user
					) })`
				)
				.addField(
					'留言內容',
					( parseMD.length > 1024 ? parseMD.substring( 0, 1021 ) + '...' : parseMD )
				);
			const tMsg =
        '<a href="https://zhwp.org/WikiProject:建立條目/詢問桌"><b>詢問桌有新留言！</b></a>\n' +
        `留言者：<a href="https://zhwp.org/User:${ data.user }">${ data.user }</a>\n` +
        '留言內容：\n' +
        ( parseHTML.length > 2048 ? parseHTML.substring( 0, 2045 ) + '...' : parseHTML );

			const iMsg =
      `${ iB }詢問桌有新留言！${ iB } <https://zhwp.org/WikiProject:建立條目/詢問桌>\n` +
      `留言者：${ data.user } <https://zhwp.org/User:${ data.user }>\n` +
      '留言內容：\n' +
      ( parseIRC.length > 2048 ? parseIRC.substring( 0, 2045 ) + '...' : parseIRC );

			send( {
				dMsg,
				tMsg,
				iMsg
			} );
		} );
	}
};

export { Event };
