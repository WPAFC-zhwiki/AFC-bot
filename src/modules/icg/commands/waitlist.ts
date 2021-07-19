import Discord from 'discord.js'

import config from 'src/util/config.json'
import * as fn from 'src/util/fn'

import getBacklogInfo from 'src/modules/backlogInfo'

let { iB } = fn

import { command } from 'icg/command'

const Command: command = {
	name: 'waitlist',
	usage: 'waitlist',
	aliases: [ '候審', '候审' ],
	description: '查看積壓狀況',
	run: async ( _client, args, reply ) => {
		const { list } = await getBacklogInfo( );
		let i = -1, len = 0, j = 0, s = 0;
		for ( let page of list ) {
			const link = `[${ page.title }](https://zhwp.org/${ page.title })\n`;
			if ( len + link.length > 2048 ) {
				j++;
				len = 0;
				s = i;
			}
			if ( j === parseInt(args[ 0 ], 10) ) {
				break;
			}
			i++;
			len += link.length;
		}

		const dMsg = new Discord.MessageEmbed()
			.setColor(
				config.embedColor
			)
			.setTitle( '候審草稿列表' )
			.setDescription(
				list.map( page => 
          `[${ page.title }](https://zhwp.org/${
            page.title
              .replace( / /g, '_' )
          })\n`
        ).slice( s, i + 1 ).join( '' )
			)
			.setTimestamp()
			.setFooter( `顯示第 ${ s + 1 } 至 ${ i + 1 } 項（共 ${ list.length } 項）` );

		const tMsg = '<b>候審草稿列表</b>\n' + 
      list.map( page => 
        `<a href="https://zhwp.org/${
          page.title.replace( / /g, '_' )
        }">${page.title}</a>\n`
      ).slice( s, i + 1 ).join( '' ) +
			`顯示第 ${ s + 1 } 至 ${ i + 1 } 項（共 ${ list.length } 項）`;

		const iMsg = `${iB}候審草稿列表${iB}\n` + 
		list.map( page => 
			`${page.title} <https://zhwp.org/${
				page.title.replace( / /g, '_' )
			}>\n`
		).slice( s, i + 1 ).join( '' ) +
		`顯示第 ${ s + 1 } 至 ${ i + 1 } 項（共 ${ list.length } 項）`;

		reply( {
			tMsg,
			dMsg,
			iMsg
		} );
	}
};

export default Command;