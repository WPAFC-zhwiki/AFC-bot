/* eslint-disable no-jquery/no-class-state */
import { MessageEmbed as DiscordMessageEmbed } from 'discord.js';
import $ from 'src/modules/jquery';

import * as logger from 'src/modules/logger';
import * as fn from 'src/util/fn';

const { iB, allowBots } = fn;

import { mwBot, recentChange } from 'src/util/bots';
import autoreview, { issuesData } from 'src/modules/autoreview';

import { MwnPage } from 'mwn';

import { event } from 'src/modules/events';

import { isReviewer } from 'src/util/reviewers';

const getReason = ( page: MwnPage, $e: JQuery<HTMLElement|Node[]> = $( '<div>' ) ) => {
	// logger.log("Start ident a reason:", new Date())
	if ( $e.find( 'table' ).length ) {
		$e.find( '.hide-when-compact, .date-container' ).remove();
	}
	if ( $e.find( '.mbox-image a' ).length ) {
		$e.find( '.mbox-image a' ).remove();
	}
	// console.log($e.prop('outerHTML'))
	$e = $(
		$e.prop( 'outerHTML' )
			.replace( /<a .*?href="(.*?)".*?>(.*?)<\/a>/gi, ( _match: string, p1: string, p2: string ) => {
				return `[${ p2 }](${ p1 })`;
			} )
			.replace( /\((?:https:\/\/zh.wikipedia.org)?\/w/g, '(https://zhwp.org/w' )
	);
	// console.log($e.prop('outerHTML'))
	const $ambox = $e.find( 'table.ambox' ).clone();
	$e.find( 'table.ambox' ).remove();
	// logger.debug($ambox.prop('outerHTML'))
	let text = $e.text().trim() + ( $ambox ? '\r• ' + $ambox.find( '.mbox-text-span' ).text().trim().split( /。/g ).join( '。\r• ' ) : '' );
	const $li = $e.find( 'li' );
	if ( $li ) {
		$li.each( ( _i, ele ) => {
			const eleText = $( ele ).text();
			text = text.replace(
				eleText,
				`${ eleText }\r• `
			);
		} );
	}
	text = text
		.split( /\r•/g )
		.map( ( x ) => x.trim() )
		.filter( ( x ) => x.length && x !== '。' )
		.join( '\r• ' );

	if ( text === '\r• 。' ) {
		return '';
	}
	// logger.log("Done identing reason:", new Date())
	return text.replace( /此條目/g, '草稿' ).replace( /\n/g, '' ).replace( /\r/g, '\n' ).replace( /\n• (?:$|\n)/g, '' );
};

const Event: event = {
	name: 'watchlist',
	fire: async ( send ) => {
		recentChange( ( data ) =>
			data.wiki === 'zhwiki' &&
			data.type === 'categorize' &&
			data.title === 'Category:正在等待審核的草稿', async ( data ) => {
			try {
				const title = data.comment.replace( /^\[\[:?([^[\]]+)\]\].*$/, '$1' );

				const { user } = data;

				let issues = [];
				const reasons = [];

				let mode: string;

				const page = new mwBot.page( title );
				// logger.log(page)
				const creator = await page.getCreator();
				await page.purge();
				let output = `[${ user }](https://zhwp.org/User:${ fn.eURIC( user ) })`;

				const wikitext = await page.text();
				const html = await mwBot.parseWikitext( wikitext, {
					title: title,
					uselang: 'zh-tw'
				} );
				const $parseHTML = $( $.parseHTML( html ) );
				const $submissionbox = $parseHTML.find( '.afc-submission-pending' ).length ?
					$parseHTML.find( '.afc-submission-pending' ).first() :
					$parseHTML.find( '.afc-submission' ).first();

				// 已接受草稿
				if (
					!$submissionbox.length && page.namespace === 0 &&
          user !== creator && isReviewer( user )
				) {
					mode = 'accept';
					output += `已接受[${ creator }](https://zhwp.org/User:${ fn.eURIC( creator ) })的草稿[${ title }](https://zhwp.org/${ fn.eURIC( title ) })`;
					let tpClass;
					try {
						const talkPage = await mwBot.read( page.getTalkPage() );
						tpClass = talkPage.revisions[ 0 ].content.match( /\|class=([^|]*?)\|/ )[ 1 ];
					} catch ( e ) {
						tpClass = '';
					}
					let cClass;
					switch ( tpClass ) {
						case 'B':
							cClass = '乙';
							break;
						case 'C':
							cClass = '丙';
							break;
						case 'start':
							cClass = '初';
							break;
						case 'stub':
							cClass = '小作品';
							break;
						case 'list':
							cClass = '列表';
							break;
					}
					if ( cClass ) {
						output += `並評為${ cClass }級。`;
					} else {
						output += '，未評級。';
					}
				// 移除AFC模板
				} else if ( !$submissionbox.length && page.namespace === 0 ) {
					const pagehistory = await page.history( 'user', 2, {
						rvslots: 'main'
					} );
					if ( pagehistory.length === 1 ) {
						mode = 'create-ns0';
						const movequery = new URLSearchParams( {
							wpOldTitle: title,
							wpNewTitle: `Draft:${ title }`,
							wpReason: '由[[Wikipedia:建立條目|建立條目精靈]]建立但錯誤放置在主名字空間且未符合條目收錄要求的草稿'
						} );
						const moveurl = `https://zh.wikipedia.org/wiki/Special:MovePage?${ movequery.toString() }`;
						output += `在條目命名空間建立了草稿<b>[${ title }](https://zhwp.org/${ fn.eURIC( title ) })</b>（[移動到草稿命名空間](${ moveurl })）`;
					} else {
						mode = 'remove';
						output += `移除了在條目命名空間的草稿<b>[${ title }](https://zhwp.org/${ fn.eURIC( title ) })</b>中的AFC模板。`;
					}
				} else if ( !$submissionbox.length ) {
					mode = 'remove';
					output += `移除了[${ creator }](https://zhwp.org/User:${ fn.eURIC( creator ) })的草稿[${ title }](https://zhwp.org/${ fn.eURIC( title ) })的AFC模板。`;
				// 提交草稿
				} else if ( $submissionbox.hasClass( 'afc-submission-pending' ) ) {
					mode = 'submit';
					output += '提交了';
					if ( creator !== user ) {
						output += `[${ creator }](https://zhwp.org/User:${ fn.eURIC( creator ) })創建的`;
					}
					output += `草稿[${ title }](https://zhwp.org/${ fn.eURIC( title ) })。`;

					issues = ( await autoreview( page, wikitext, $parseHTML, { user, creator } ) ).issues;
				} else if (
					$submissionbox.hasClass( 'afc-submission-declined' ) ||
					$submissionbox.hasClass( 'afc-submission-rejected' )
				) {
					output += '將';
					if ( wikitext.match( /\|u=([^|]+)\|/ ) ) {
						const submituser = wikitext.match( /\|u=([^|]+)\|/ )[ 1 ];
						output += `提交者[${ submituser }](https://zhwp.org/User:${ fn.eURIC( submituser ) })所提交的`;
					} else {
						output += `建立者[${ creator }](https://zhwp.org/User:${ fn.eURIC( creator ) })的`;
					}
					output += `草稿[${ title }](https://zhwp.org/${ fn.eURIC( title ) })標記為`;
					if ( $submissionbox.hasClass( 'afc-submission-rejected' ) ) {
						mode = 'reject';
						output += '拒絕再次提交的草稿';
					} else {
						mode = 'decline';
						output += '仍需改善的草稿';
					}
					const $reasonbox = $submissionbox.find( '.afc-submission-reason-box' );
					if ( $reasonbox.children().length ) {
						$reasonbox.children().each( function ( _i, $e ) {
							if (
								$( $e ).children().length > 1 &&
                $( $e ).children().length === $( $e ).children( 'table, hr' ).length
							) {
								$( $e ).children().each( function ( _ei, $ee ) {
									const res = getReason( page, $( $ee ) );
									if ( res.length > 0 ) {
										reasons.push( getReason( page, $( $ee ) ) );
									}
								} );
							} else {
								reasons.push( getReason( page, $( $e ) ) );
							}
						} );
					}
				}

				if ( output === `[${ user }](https://zhwp.org/User:${ fn.eURIC( user ) })` ) {
					return;
				}

				const dMsg = new DiscordMessageEmbed().setDescription( `**${ output.replace( /<b>(.*?)<\/b>/, '$1' ) }**` );
				let tMsg = output;
				if ( issues && issues.length ) {
					dMsg.addField(
						'自動檢測問題',
						`• ${ issues.map( ( x ) => `${ issuesData[ x ].short } (${ x })` ).join( '\n• ' ) }`
					);
					tMsg += '\n\n<b>自動檢測問題</b>\n• ' + issues.map( ( x ) => `${ issuesData[ x ].short } (${ x })` ).join( '\n• ' );
				}
				if ( mode === 'decline' || mode === 'reject' ) {
					console.log( reasons );
					dMsg.addField(
						'拒絕理由',
						reasons.length ?
							`• ${ reasons.map( ( v ) => `${ v.trim() }` ).join( '\n• ' ) }` :
							'未提供拒絕理由。'
					);
					tMsg += (
						reasons.length ?
							`，理由如下：\n• ${ reasons.map( ( v ) => `${ v.trim() }` ).join( '\n• ' ) }` :
							'，未提供拒絕理由。'
					);
				}

				const iMsg = tMsg.replace( /(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, ' $1 <$2> ' )
					.replace( /<b>(.*?)<\/b>/g, `${ iB }$1${ iB }` );
				tMsg = tMsg.replace( /(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, '<a href="$2">$1</a>' );
				console.log( tMsg );
				send( {
					dMsg,
					tMsg,
					iMsg
				} );

				if ( mode === 'submit' ) {
					if ( issues && issues.length > 0 ) {
						const now = new Date();
						const { query: tpQuery } = await mwBot.request( {
							action: 'query',
							titles: `User talk:${ user }`,
							prop: 'info'
						} );

						if (
							tpQuery.pages[ Object.keys( tpQuery.pages )[ 0 ] ].contentmodel === 'wikitext'
						) {
							const talkPage = new mwBot.page( `User talk:${ user }` );
							// let talkPage = new mwBot.page(`User:LuciferianThomas/AFC測試2`)
							const tpWkt = await talkPage.text();
							if ( !allowBots( tpWkt ) ) {
								return;
							}

							talkPage.edit( () => {
								return {
									section: 'new',
									sectiontitle: `您提交的草稿[[:${ title }]]自動審閱結果（${ now.getMonth() + 1 }月${ now.getDate() }日）`,
									text: `{{subst:AFC botreview|reason=<nowiki/>\n* ${
										issues.map( ( x ) => `${ issuesData[ x ].long }` ).join( '\n* ' )
									}|botsig=--<span style="background:#ddd;padding:0.2em 0.75em;border:1px solid #999;border-radius:0.5em;">'''[[U:LuciferianBot|<span style="color:#000">路西法BOT</span>]]'''<sup>[[PJ:AFC|AFC]]</sup> • [[UT:LXFRNT|<span style="color:#000">留言</span>]]</span> ~~~~~}}`,
									summary: `[[PJ:AFC|建立條目專題]]草稿[[:${ title }]]自動審閱結果`,
									bot: true
								};
							} );
						} else {
							const { query } = await mwBot.request( {
								action: 'query',
								format: 'json',
								meta: 'tokens'
							} );
							const flowToken = query.tokens.csrftoken;
							await mwBot.request( {
								action: 'flow',
								format: 'json',
								submodule: 'new-topic',
								page: `User talk:${ user }`,
								// page: `User talk:LuciferianThomas/AFC測試2`,
								nttopic: `您提交的草稿[[:${ title }]]自動審閱結果（${ now.getMonth() + 1 }月${ now.getDate() }日）`,
								ntcontent: `{{subst:AFC botreview|reason=<nowiki/>\n* ${
									issues.map( ( x ) => `${ issuesData[ x ].long }` ).join( '\n* ' )
								}|botsig=--<span style="background:#ddd;padding:0.2em 0.75em;border:1px solid #999;border-radius:0.5em;">'''[[U:LuciferianBot|<span style="color:#000">路西法BOT</span>]]'''<sup>[[PJ:AFC|AFC]]</sup> • [[UT:LXFRNT|<span style="color:#000">留言</span>]]</span> ~~~~~}}`,
								ntformat: 'wikitext',
								token: flowToken
							} );
						}
					}
				}
			} catch ( error ) {
				logger.error( error );
			}
		} );
	}
};

export { Event };
