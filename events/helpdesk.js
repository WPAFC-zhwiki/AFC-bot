const EventSource = require( "eventsource" )
    , RTRC = new EventSource( "https://stream.wikimedia.org/v2/stream/recentchange" )
    , { MessageEmbed: DiscordMessageEmbed } = require( "discord.js" )
    , $ = require( process.cwd() + '/modules/jquery' )

const logger = require( process.cwd() + '/modules/logger' )
    , fn = require( process.cwd() + '/util/fn' )

const { iB } = fn

const { mwBot } = require(process.cwd() + '/util/bots.js')

module.exports = {
  name: "helpdesk",
  fire: async send => {
    RTRC.onmessage = async function (event) {
      const data = JSON.parse(event.data)
      if (
        data.wiki !== "zhwiki" ||
        (
          data.title !== "WikiProject:建立條目/詢問桌"
          // && data.title !== "User:LuciferianThomas/AFC測試2" // only for PJ:AFC/HD testing
        ) ||
        data.length.old >= data.length.new + 10
      ) {
        return
      }


      let { compare } = await mwBot.request({
        action: "compare",
        format: "json",
        fromrev: data.revision.old,
        torev: data.revision.new
      })
      let $diff = $('<table>').append(compare.body)
      let diffText = ""
      $diff.find('.diff-addedline').each((_i, ele) => {
        diffText += $(ele).text() + "\n"
      })
      let parse = await mwBot.parseWikitext(diffText)
      let parseTG = $(
        parse.replace(/(?:https:\/\/zh.wikipedia.org)?\/w/g,"https://zhwp.org/w")
          .replace(/<(\/?)a(.*?)>/g, "&lt;$1a$2&gt;")
      ).text()
      parse = parse
        .replace(/<a .*?href="(.*?)".*?>(.*?)<\/a>/gi, (match, p1, p2, offset, string) => {
          return `[${p2}](${fn.eURIC(p1)})`
        })
        .replace(/\((?:https:\/\/zh.wikipedia.org)?\/w/g,"(https://zhwp.org/w")
      let $parse = $(parse)
      let parseText = $parse.text()
      let parseIRC = parseText.replace(/(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, ` $1 <$2> `)

      let dMsg = new DiscordMessageEmbed()
        .setColor("BLUE")
        .setTitle("詢問桌有新留言！")
        .setURL("https://zhwp.org/WikiProject:建立條目/詢問桌")
        .setDescription(
          `留言者：[${data.user}](https://zhwp.org/User:${fn.eURIC(
            data.user
          )})`
        )
        .addField(
          "留言內容",
          (parseText.length > 1024 ? parseText.substring(0, 1021) + "..." : parseText)
        )
      let tMsg =
        `<a href="https://zhwp.org/WikiProject:建立條目/詢問桌"><b>詢問桌有新留言！</b></a>\n` +
        `留言者：<a href="https://zhwp.org/User:${data.user}">${data.user}</a>\n` +
        `留言內容：\n` +
        (parseTG.length > 2048 ? parseTG.substring(0, 2045) + "..." : parseTG)
      
      let iMsg =
      `${iB}詢問桌有新留言！${iB} <https://zhwp.org/WikiProject:建立條目/詢問桌>\n` +
      `留言者：${data.user} <https://zhwp.org/User:${data.user}>\n` +
      `留言內容：\n` +
      (parseText.length > 2048 ? parseText.substring(0, 2045) + "..." : parseText)
      
      send({
        dMsg,
        tMsg,
        iMsg
      })
    }
  },
}
