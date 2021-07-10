const { MessageEmbed: DiscordMessageEmbed } = require( "discord.js" )
    , $ = require( process.cwd() + '/modules/jquery' )
    
const logger = require( process.cwd() + '/modules/logger' )
    , fn = require( process.cwd() + '/util/fn' )

const { iB } = fn

const { mwBot } = require(process.cwd() + '/util/bots.js')
    , autoprview = require(process.cwd() + '/modules/autoreview.js')
    , issuesData = require(process.cwd() + '/modules/issuedata.json')

const getReason = (page, $e = $("<div>")) => {
  // logger.log("Start ident a reason:", new Date())
  if ($e.find("table").length) {
    $e.find(".hide-when-compact, .date-container").remove()
  }
  if ($e.find(".mbox-image a").length) {
    $e.find(".mbox-image a").remove()
  }
  console.log($e.prop('outerHTML'))
  $e = $(
    $e.prop('outerHTML')
      .replace(/<a .*?href="(.*?)".*?>(.*?)<\/a>/gi, (match, p1, p2, offset, string) => {
        return `[${p2}](${p1})`
      })
      .replace(/\((?:https:\/\/zh.wikipedia.org)?\/w/g,"(https://zhwp.org/w")
  )
  console.log($e.prop('outerHTML'))
  let $ambox = $e.find("table.ambox").clone()
  $e.find("table.ambox").remove()
  // logger.debug($ambox.prop('outerHTML'))
  let text = $e.text().trim() + ($ambox ? "\r• "+$ambox.find(".mbox-text-span").text().trim().split(/。/g).join("。\r• ") : "")
  let li = $e.find("li")
    , hr = $e.find("hr")
  if (li) {
    li.each((_i, ele) => {
      let eleText = $(ele).text()
      text = text.replace(
        eleText,
        `${eleText}\r• `
      )
    })
  }
  text = text
    .split(/\r•/g)
    .map(x => x.trim())
    .filter(x => x.length && x !== "。")
    .map(x => x.split(/[。！？]/g)[0] + "。")
    .join("\r• ")

  if (text === "\r• 。") {
    return ""
  }
  // logger.log("Done identing reason:", new Date())
  return text.replace(/此條目/g, "草稿").replace(/\n/g, "").replace(/\r/g,"\n").replace(/\n• (?:$|\n)/g,"")
}

const allowBots = (text, user = "LuciferianBot") => {
  if (!new RegExp("\\{\\{\\s*(nobots|bots[^}]*)\\s*\\}\\}", "i").test(text)) return true;
  return (new RegExp("\\{\\{\\s*bots\\s*\\|\\s*deny\\s*=\\s*([^}]*,\\s*)*"+user+"\\s*(?=[,\\}])[^}]*\\s*\\}\\}", "i").test(text)) ? false : new RegExp("\\{\\{\\s*((?!nobots)|bots(\\s*\\|\\s*allow\\s*=\\s*((?!none)|([^}]*,\\s*)*"+user+"\\s*(?=[,\\}])[^}]*|all))?|bots\\s*\\|\\s*deny\\s*=\\s*(?!all)[^}]*|bots\\s*\\|\\s*optout=(?!all)[^}]*)\\s*\\}\\}", "i").test(text);
}

module.exports = {
  name: 'watchlist',
  fire: async (send) => {
    await mwBot.loggedIn;
    let stream = new mwBot.stream( "recentchange" );
    // console.log(stream)
    stream.addListener((data) => {
      return (
        data.wiki === 'zhwiki'
        && data.type === 'categorize'
        && data.title === 'Category:正在等待審核的草稿'
      )
    }, async (data) => {
      logger.log(data.user, data.comment);

      const title = data.comment.replace(/^\[\[:?([^[\]]+)\]\].*$/, '$1');

      // if (status == "removed") return; // 稍後處理
      let { user } = data;

      let issues = []
        , reasons = []
      
      let mode

      let page = new mwBot.page(title);
      // logger.log(page)
      let creator = await page.getCreator();
      await page.purge();
      let output = `[${user}](https://zhwp.org/User:${fn.eURIC(user)})`;

      let wikitext = await page.text();
      let html = await mwBot.parseWikitext(wikitext, {
        title: title,
        uselang: 'zh-tw'
      });
      let $parseHTML = $($.parseHTML(html));
      let $submissionbox = $parseHTML.find('.afc-submission-pending').length 
        ? $parseHTML.find('.afc-submission-pending').first()
        : $parseHTML.find('.afc-submission').first();
      logger.debug($submissionbox.length, page.namespace)
      if (!$submissionbox.length && page.namespace === 0) {
        mode = "accept"
        output += `已接受[${creator}](https://zhwp.org/User:${fn.eURIC(creator)})的草稿[${title}](https://zhwp.org/${fn.eURIC(title)})`;
        let tpClass;
        try {
          let talkPage = await mwBot.read(page.getTalkPage());
          tpClass = talkPage.revisions[0].content.match(/\|class=([^|]*?)\|/)[1];
        } catch (e) {
          tpClass = '';
        }
        let cClass;
        switch (tpClass) {
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
        if (cClass) output += `並評為${cClass}級。`;
        else output += `，未評級。`
      } else if (!$submissionbox.length && page.namespace !== 0) {
        mode = "remove"
        output += `移除了[${creator}](https://zhwp.org/User:${fn.eURIC(creator)})的草稿[${title}](https://zhwp.org/${fn.eURIC(title)})的AFC模板。`;
      } else if ($submissionbox.hasClass('afc-submission-pending')) {
        mode = "submit"
        output += '提交了';
        if (creator !== user) {
          output += `[${creator}](https://zhwp.org/User:${fn.eURIC(creator)})創建的`;
        }
        output += `草稿[${title}](https://zhwp.org/${fn.eURIC(title)})。`;

        issues = (await autoprview(wikitext, $parseHTML.children())).issues
      } else if (
        $submissionbox.hasClass('afc-submission-declined') ||
        $submissionbox.hasClass('afc-submission-rejected')
      ) {
        output += '將';
        if (wikitext.match(/\|u=([^|]+)\|/)) {
          let submituser = wikitext.match(/\|u=([^|]+)\|/)[1];
          output += `提交者[${submituser}](https://zhwp.org/User:${fn.eURIC(submituser)})所提交的`;
        } else {
          output += `建立者[${creator}](https://zhwp.org/User:${fn.eURIC(creator)})的`;
        }
        output += `草稿[${title}](https://zhwp.org/${fn.eURIC(title)})標記為`;
        if ($submissionbox.hasClass('afc-submission-rejected')) {
          mode = "reject"
          output += '拒絕再次提交的草稿';
        } else {
          mode = "decline"
          output += '仍需改善的草稿';
        }
        let $reasonbox = $submissionbox.find('.afc-submission-reason-box');
        if ($reasonbox.children().length) {
          $reasonbox.children().each(function (_i, $e) {
            if ($($e).children().length > 1 && $($e).children() === $($e).children('table, hr').length) {
              $($e).children().each(function (_ei, $ee) {
                let res = getReason(page, $($ee));
                if (res.length > 0) {
                  reasons.push(getReason(page, $($ee)));
                }
              });
            } else {
              reasons.push(getReason(page, $($e)));
            }
          });
        }
      }

      if (output === `[${user}](https://zhwp.org/User:${fn.eURIC(user)})`) {
        return;
      }

      let dMsg = new DiscordMessageEmbed().setDescription(`**${output}**`);
      let tMsg = output;
      if (issues && issues.length) {
        dMsg.addField(
          "自動檢測問題",
          `• ${issues.map(x => `${issuesData[x].short} (${x})`).join('\n• ')}`
        )
        tMsg += '\n\n<b>自動檢測問題</b>\n• ' + issues.map((x) => `${issuesData[x].short} (${x})`).join('\n• ')
      }
      if (mode == "decline" || mode == "reject") {
        console.log(reasons)
        dMsg.addField(
          "拒絕理由",
          reasons.length 
            ? `• ${reasons.map(v => `${v.trim()}`).join('\n• ')}` 
            : "未提供拒絕理由。"
        )
        tMsg += (
          reasons.length
            ? `，理由如下：\n• ${reasons.map(v => `${v.trim()}`).join('\n• ')}` 
            : "，未提供拒絕理由。"
        )
      }

      let iMsg = tMsg.replace(/(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, ` $1 <$2> `)
        .replace(/<b>(.*?)<\/b>/g, `${iB}$1${iB}`)
      tMsg = tMsg.replace(/(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, `<a href="$2">$1</a>`)
      console.log(tMsg)
      send({
        dMsg,
        tMsg,
        iMsg
      });

      if (mode == "submit") {
        if (issues && issues.length > 0) {
          let now = new Date()
          let { query: tpQuery } = await mwBot.request({
            action: "query",
            titles: `User talk:${user}`,
            prop: "info"
          })

          if (
            Object.values(tpQuery.pages)[0].contentmodel == "wikitext"
          ) {
            // let talkPage = new mwBot.page(`User talk:${user}`)
            let talkPage = new mwBot.page(`User:LuciferianThomas/AFC測試2`)
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
                bot: true
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
              // page: `User talk:${user}`,
              page: `User talk:LuciferianThomas/AFC測試2`,
              nttopic: `您提交的草稿[[:${title}]]自動審閱結果（${now.getMonth()+1}月${now.getDate()}日）`,
              ntcontent: `{{subst:AFC botreview|reason=<nowiki/>\n* ${
                issues.map(x => `${issuesData[x].long}`).join("\n* ")
              }|botsig=--<span style="background:#ddd;padding:0.2em 0.75em;border:1px solid #999;border-radius:0.5em;">'''[[U:LuciferianBot|<span style="color:#000">路西法BOT</span>]]'''<sup>[[PJ:AFC|AFC]]</sup> • [[UT:LXFRNT|<span style="color:#000">留言</span>]]</span> ~~~~~}}`,
              ntformat: "wikitext",
              token: flowToken,
            })
          }
        }
      }
    })
  }
};
