const Discord = require('discord.js')
    , $ = require( "jquery" )( new ( require( "jsdom" ).JSDOM )().window )
    , fn = require( process.cwd() + '/util/fn' )

const { mwBot } = require( process.cwd() + '/util/bots.js' )
    , autoprview = require( process.cwd() + '/modules/autoreview' )
    , issuesData = require( process.cwd() + '/modules/issuedata.json' );

module.exports = {
  name: 'autoreview',
  usage: 'autoreview',
  aliases: [ '自動審閱', '自动审阅', 'ar' ],
  description: '自動審閱頁面並找出可能存在的問題',
  /**
   * @type {import('../modules/command').run}
   */
  run: async ( _client, args, reply ) => {
    if ( !args.length ) {
      reply( {
        tMsg: '請輸入頁面名稱！',
        dMsg: '請輸入頁面名稱！'
      }, true );
      return;
    }
    reply( {
      tMsg: "計算中……",
      dMsg: "計算中……"
    }, false );
    const title = args.join( ' ' );
    const page = new mwBot.page( title );
    const wikitext = await page.text();
    const html = await mwBot.parseWikitext( wikitext, {
      title: title,
      uselang: 'zh-hant'
    } );
    const $parseHTML = $( $.parseHTML( html ) ).children();

    const { issues } = await autoprview( wikitext, $parseHTML );

    let output = `系統剛剛自動審閱了[${ title }](https://zhwp.org/${ fn.URL( title ) })頁面，初步`;

    if ( issues && issues.length > 0 ) {
      output += '發現可能存在以下問題：\n• ' + issues.map( ( x ) => `${ issuesData[ x ].short } (${ x })` ).join( '\n• ' );
    } else {
      output += '沒有發現顯著的問題。';
    }

    const dMsg = new Discord.MessageEmbed()
      .setColor( issues && issues.length ? 'RED' : 'GREEN' )
      .setTitle( '自動審閱系統' )
      .setDescription( output )
      .setTimestamp();

    const tMsg = `<b>自動審閱系統</b>\n${ output.replace(/(?<!\[)\[(.*?)\]\((.*?)\)(?!\))/g, `<a href="$2">$1</a>`) }`;

    reply( {
      tMsg,
      dMsg
    }, false);
  }
};