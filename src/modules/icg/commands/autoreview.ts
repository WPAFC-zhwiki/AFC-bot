import Discord from 'discord.js'
import $ from "src/modules/jquery"
import * as fn from 'src/util/fn'

import { mwBot } from 'src/util/bots'
import autoreview from 'src/modules/autoreview'
import { issuesData } from 'src/modules/autoreview'

import { iB, allowBots } from 'src/util/fn'

import { command } from 'icg/command'

const Command: command = {
  name: 'autoreview',
  usage: 'autoreview',
  aliases: [ '自動審閱', '自动审阅', 'ar' ],
  description: '自動審閱頁面並找出可能存在的問題',
  run: async ( _client, args, reply ) => {
    if ( !args.length ) {
      reply( {
        tMsg: '請輸入頁面名稱！',
        dMsg: '請輸入頁面名稱！',
        iMsg: '請輸入頁面名稱！'
      }, true );
      return;
    }
    reply( {
      tMsg: "計算中……",
      dMsg: "計算中……",
      iMsg: "計算中……"
    }, false );

    let argsStr = args.join( ' ' )
    let argsList: any = {}
    let matches = argsStr.match(/(?:--|\—)(.*?)=([^\s]*|".*?")/g)
    if (matches) matches.forEach( (v, i) => {
      let match = v.match(/(?:--|—)(.*?)=([^\s]*|".*?")/)
      argsList[ match[1] ] = match[2].replace(/^"(.*?)"$/g, "$1")
    } )
    argsStr = argsStr.replace(/(?:--|—)(.*?)=([^\s]*|".*?")/g, "")
    console.log(argsStr, argsList)
    
    let title: string = argsStr.split( '#' )[ 0 ].trim();

    /**
     * @type {import('mwn').MwnPage}
     */
    let page;
    try {
      page = new mwBot.page( title );
    } catch ( e ) {
      return reply( {
        tMsg: `標題<b><a href="https://zhwp.org/${ encodeURI(title )}">${title}</a></b>不合法或是頁面不存在。`,
        dMsg: `標題**[${title}](https://zhwp.org/${ fn.eURIC(title) })**不合法或是頁面不存在。`,
        iMsg: `標題 ${title} <https://zhwp.org/${ fn.eURIC(title) }> 不合法或是頁面不存在。`
      }, true )
    }

    let redirect = false
      , rdrTgt = '', rdrFrom
    try {
      redirect = await page.isRedirect()
      rdrTgt = await page.getRedirectTarget()
    } catch ( e ) {
      return reply( {
        tMsg: `頁面<b><a href="https://zhwp.org/${ encodeURI(title) }">${title}</a></b>不存在。`,
        dMsg: `頁面**[${title}](https://zhwp.org/${ fn.eURIC(title) })**不存在。`,
        iMsg: `頁面 ${title} <https://zhwp.org/${ fn.eURIC(title) }> 不存在。`
      }, true )
    }

    if ( redirect ) {
      page = new mwBot.page( rdrTgt )
      rdrFrom = `${title}`
      title = `${rdrTgt}`
    }
    let creator = await page.getCreator();

    if ( [ 0, 2, 118 ].indexOf( page.namespace ) === -1 ) {
      return reply( {
        tMsg: `頁面<b><a href="https://zhwp.org/${ encodeURI(title) }">${title}</a></b>${rdrFrom ? `（重新導向自<a href="https://zhwp.org/${ encodeURI(rdrFrom) }">${rdrFrom}</a>）` : ""}不在條目命名空間、使用者命名空間或草稿命名空間，不予解析。`,
        dMsg: new Discord.MessageEmbed()
          .setColor( 'YELLOW' )
          .setDescription( `頁面**[${title}](https://zhwp.org/${ encodeURI(title) })**${rdrFrom ? `（重新導向自[${rdrFrom}](https://zhwp.org/${ encodeURI(rdrFrom) })）` : ""}不在條目命名空間、使用者命名空間或草稿命名空間，不予解析。` ),
        iMsg: `頁面 ${title} <https://zhwp.org/${ encodeURI(title) }> ${rdrFrom ? `（重新導向自 ${rdrFrom} <https://zhwp.org/${ encodeURI(rdrFrom) }> ）` : ""}不在條目命名空間、使用者命名空間或草稿命名空間，不予解析。`
      } );
    }

    const wikitext = await page.text();
    const html = await mwBot.parseWikitext( wikitext, {
      title: title,
      uselang: 'zh-hant'
    } );
    const $parseHTML = $( $.parseHTML( html ) );

    const { issues } = await autoreview( page, wikitext, $parseHTML, { creator } );

    let output = `系統剛剛自動審閱了<b>[${ title }](https://zhwp.org/${ fn.eURIC( title ) })</b>頁面${rdrFrom ? `（重新導向自[${rdrFrom}](https://zhwp.org/${ encodeURI(rdrFrom) })）` : ""}，初步`;

    if ( issues && issues.length > 0 ) {
      output += '發現可能存在以下問題：\n• ' + issues.map( ( x ) => `${ issuesData[ x ].short } (${ x })` ).join( '\n• ' );
    } else {
      output += '沒有發現顯著的問題。';
    }

    const dMsg = new Discord.MessageEmbed()
      .setColor( issues && issues.length ? 'RED' : 'GREEN' )
      .setTitle( '自動審閱系統' )
      .setDescription( output.replace(/<b>(.*?)<\/b>/g, "**$1**") )
      .setTimestamp();

    const tMsg = `<b>自動審閱系統</b>\n${
      output.replace(/(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, `<a href="$2">$1</a>`)
    }`;
    const iMsg = `${iB}自動審閱系統${iB}\n${
      output.replace(/(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, ` $1 <$2> `)
        .replace(/<b>(.*?)<\/b>/g, `${iB}$1${iB}`)
    }`;

    reply( {
      tMsg,
      dMsg,
      iMsg
    }, false);

    // /** ONLY FOR TESTING
    if (issues && issues.length > 0 && argsList.fwd) {
      let now = new Date()
      let { query: tpQuery } = await mwBot.request({
        action: "query",
        titles: `User talk:${creator}`,
        // titles: `User talk:LuciferianThomas/AFC測試2`,
        prop: "info"
      })

      if (
        tpQuery.pages[Object.keys(tpQuery.pages)[0]].contentmodel == "wikitext"
      ) {
        let talkPage = new mwBot.page(`User talk:${creator}`)
        // let talkPage = new mwBot.page(`User talk:LuciferianThomas/AFC測試2`)
        let tpWkt = await talkPage.text()
        if (!allowBots(tpWkt)) return;

        talkPage.edit(({ content }) => {
          return {
            section: "new",
            sectiontitle: `您提交的草稿[[:${title}]]自動審閱結果（${now.getMonth()+1}月${now.getDate()}日）`,
            text: `{{subst:AFC botreview|reason=<nowiki/>\n* ${
              issues.map(x => `${issuesData[x].long}`).join("\n* ")
            }|botsig=--<span style="background:#ddd;padding:0.2em 0.75em;border:1px solid #999;border-radius:0.5em;">'''[[U:LuciferianBot|<span style="color:#000">路西法BOT</span>]]'''<sup>[[PJ:AFC|AFC]]</sup> • [[UT:LXFRNT|<span style="color:#000">留言</span>]]</span> ~~~~~}}`,
            summary: `[[PJ:AFC|建立條目專題]]草稿[[:${title}]]自動審閱結果`,
          }
        })
      }
      else {
        let { query } = await mwBot.request({
          action: "query",
          format: "json",
          meta: "tokens"
        })
        let flowToken = query.tokens.csrftoken
        await mwBot.request({
          action: "flow",
          format: "json",
          submodule: "new-topic",
          page: `User talk:${creator}`,
          // page: `User talk:LuciferianThomas/AFC測試2`,
          nttopic: `您提交的草稿[[:${title}]]自動審閱結果（${now.getMonth()+1}月${now.getDate()}日）`,
          ntcontent: `{{subst:AFC botreview|reason=<nowiki/>\n* ${
            issues.map(x => `${issuesData[x].long}`).join("\n* ")
          }|botsig=--<span style="background:#ddd;padding:0.2em 0.75em;border:1px solid #999;border-radius:0.5em;">'''[[U:LuciferianBot|<span style="color:#000">路西法BOT</span>]]'''<sup>[[PJ:AFC|AFC]]</sup> • [[UT:LXFRNT|<span style="color:#000">留言</span>]]</span> ~~~~~}}`,
          ntformat: "wikitext",
          token: flowToken,
        })
      }
    }
    // **/
  }
};

export { Command };