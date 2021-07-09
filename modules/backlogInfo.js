const $ = require( process.cwd() + '/modules/jquery.js' )
    , { MessageEmbed: DiscordMessageEmbed } = require( 'discord.js' )
    , config = require( process.cwd() + '/util/config.json' )
    , { mwBot } = require( process.cwd() + '/util/bots.js' );

const { iB } = require( process.cwd() + '/util/fn' )

module.exports = async () => {
  let list = await new mwBot.category( 'Category:正在等待審核的草稿' ).members({
    cmtype: "page"
  });
  const cnt = list.length;
  const html = await mwBot.parseTitle( 'Template:AFC_status/level' );
  const $rawLvl = $( $.parseHTML( html ) );
  const lvl = parseInt( $rawLvl.find( 'p' ).text(), 10 );

  const dMsg = new DiscordMessageEmbed()
    .setColor( function () {
      switch ( lvl ) {
        case 0:
          return 0x87ceeb;
        case 1:
          return 0x4169e1;
        case 2:
          return 0x32CD32;
        case 3:
          return 'YELLOW';
        case 4:
          return 'ORANGE';
        case 5:
          return 'RED';
        case 6:
          return 0x7F0000;
        case 7:
          return 0x3F0000;
        case 8:
          return 0x1A0000;
        case 9:
          return 'DARK_BUT_NOT_BLACK';
        default:
          return config.embedColor;
      }
    }() )
    .setTitle( '條目審核積壓' )
    .setDescription(
      `現時條目審核專題共有 **${ cnt }** 個積壓草稿需要審核，積壓 **~${ lvl }** 週。`
    )
    .addField( '工具欄', [
      '[待審草稿](https://zhwp.org/Category:正在等待審核的草稿)',
      '[隨機跳轉](https://zhwp.org/Special:RandomInCategory/Category:正在等待審核的草稿)'
    ].join( ' **·** ' ) )
    .setTimestamp();

  const tMsg = `<b>條目審核積壓</b>
現時條目審核專題共有 <b>${ cnt }</b> 個積壓草稿需要審核，積壓 <b>~${ lvl }</b> 週。
———
<b>工具欄</b>
<a href="https://zhwp.org/Category:正在等待審核的草稿">待審草稿</a> · <a href="https://zhwp.org/Special:RandomInCategory/Category:正在等待審核的草稿">隨機跳轉</a>`;

  const iMsg = `${iB}條目審核積壓${iB}
現時條目審核專題共有 ${iB}${ cnt }${iB} 個積壓草稿需要審核，積壓 ${iB}~${ lvl }${iB} 週。
———
${iB}工具欄${iB}
待審草稿 <https://zhwp.org/Category:正在等待審核的草稿>\n隨機跳轉 <https://zhwp.org/Special:RandomInCategory/Category:正在等待審核的草稿>`;

  return {
    cnt,
    list,
    lvl,
    dMsg,
    tMsg,
    iMsg
  };
};
