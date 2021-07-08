const EventSource = require( "eventsource" )
    , RTRC = new EventSource( "https://stream.wikimedia.org/v2/stream/recentchange" )
    , { MessageEmbed: DiscordMessageEmbed } = require( "discord.js" )
    , $ = require( process.cwd() + '/modules/jquery' )

const logger = require( process.cwd() + '/modules/logger' )

const { mwBot } = require(process.cwd() + '/util/bots.js')

module.exports = {
  name: "helpdesk",
  fire: async send => {
    RTRC.onmessage = async function (event) {
      const data = JSON.parse(event.data)
      if (
        data.wiki !== "zhwiki" ||
        data.title !== "WikiProject:建立條目/詢問桌" ||
        data.length.old >= data.length.new + 10
      ) {
        return
      }

      logger.log(data.user)

      let { compare } = await mwBot.request({
        action: "compare",
        format: "json",
        fromrev: data.revision.old,
        torev: data.revision.new
      })
      logger.debug("\n",compare)
      let $diff = $('<table>').append(compare.body)
      let diffText = ""
      $diff.find('.diff-addedline').each((_i, ele) => {
        diffText += $(ele).text() + "\n"
      })
      console.log(diffText)
      let parse = await mwBot.parseWikitext(diffText)
      parse = parse
        .replace(/<a .*?href="(.*?)".*?>(.*?)<\/a>/gi, (match, p1, p2, offset, string) => {
          return `[${p2}](${encodeURI(p1.replace(/([_*~\[\]\(\)])/g,"\\$1"))})`
        })
        .replace(/\((?:https:\/\/zh.wikipedia.org)?\/w/g,"(https://zhwp.org/w")
      let $parse = $(parse)
      let parseText = $parse.text()
      console.log(parseText)

      let dMsg = new DiscordMessageEmbed()
        .setColor("BLUE")
        .setTitle("詢問桌有新留言！")
        .setURL("https://zhwp.org/WikiProject:建立條目/詢問桌")
        .setDescription(
          `留言者：[${data.user}](https://zhwp.org/User:${encodeURI(
            data.user
          )})`
        )
        .addField(
          "留言內容",
          (parseText.length > 1024 ? parseText.substring(0, 1021) + "..." : parseText)
        )
      let tMsg =
        `[詢問桌有新留言！](https://zhwp.org/WikiProject:建立條目/詢問桌)\n` +
        `留言者：[${data.user}](https://zhwp.org/User:${encodeURI(data.user)})\n` +
        `留言內容：\n` +
        (parseText.length > 2048 ? parseText.substring(0, 2045) + "..." : parseText)
      
      send({
        dMsg,
        tMsg,
      })
    }
  },
}
