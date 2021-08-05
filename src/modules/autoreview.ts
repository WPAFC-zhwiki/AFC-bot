import $ from 'src/modules/jquery'

import { MwnPage } from 'mwn'

const findCopyvio = async (qString) => {
  return 0;
  // try {
  //   let gResults = await googleIt({
  //     query: `"${qString}" -site:*.wikipedia.org`,
  //     disableConsole: true
  //   })
  //   let matchScore = 0
  //   for (r of gResults) {
  //     let s = fuzzy(qString, r.snippet) * 100
  //     if (s > matchScore) matchScore = s
  //     if (s == 100) break;
  //   }
  //   logger.log(qString, matchScore)
  //   return matchScore
  // } catch (e) {
  //   return 0
  // }
}

export type elementsTS = {
	intLinks: RegExpMatchArray;
	refs: {
		all: {
			wt: string[][];
			$ele: JQuery<HTMLElement>
		};
		default: string[][];
		$references: JQuery<HTMLElement>;
		$disallowed: JQuery<HTMLElement>;
		$unreliable: JQuery<HTMLElement>;
	},
	cats: RegExpMatchArray
}

export default async function ( page: MwnPage, wikitext: string, $parseHTML: JQuery<HTMLElement|Node[]>, ext?: { user?: string, creator?: string } ): Promise<{
	issues: string[];
	elements: elementsTS;
}> {
	const issues: string[] = [];

	let title = page.getMainText();

	if ( title === ext.user ) {
		issues.push( 'same-name' );
	} else if ( title === ext.creator ) {
		issues.push( 'same-name-creator' );
	} else {
		if ( page.namespace === 2 ) {
			const split = title.split( '/' );
			split.shift();

			if ( !split.length ) {
				return;
			}

			title = split.join( '/' );
		}

		if ( title.includes( ext.user ) || ext.user.includes( title ) ) {
			issues.push( 'same-name' );
		} else if ( title.includes( ext.creator ) || ext.creator.includes( title ) ) {
			issues.push( 'same-name-creator' );
		}
	}

	const defaults = [
		'\'\'\'此处改为条目主题\'\'\'(?:是一个)?',
		'==\\s*章节标题\\s*=='
	];
	const regexp = new RegExp( `(${ defaults.join( '|' ) })` );
	if ( regexp.exec( wikitext ) ) {
		issues.push( 'default-wikitext' );
	}

	const delval = {
		tags: [
			// 表格
			'table',
			'tbody',
			'td',
			'tr',
			'th',
			'pre',
			// 樣式
			'style',
			// 標題常常解析出一堆亂象
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6'
		],
		ids: [
			// 小作品標籤
			'stub',
			// 目錄
			'toc'
		],
		classes: [
			// NoteTA
			'noteTA',
			// 表格
			'infobox',
			'wikitable',
			'navbox',
			// &#60;syntaxhighlight&#62;
			'mw-highlight',
			// 圖片說明
			'thumb',
			// &#60;reference /&#62;
			'reflist',
			'references',
			'reference',
			// 不印出來的
			'noprint',
			// 消歧義
			'hatnote',
			'navigation-not-searchable',
			// 目錄
			'toc',
			// edit
			'mw-editsection',
			// {{AFC comment}}
			'afc-comment'
		]
	};

	const $countHTML = $parseHTML.clone();

	$countHTML.find( function () {
		let selector = '';

		delval.tags.forEach( function ( tag ) {
			selector += selector === '' ? tag : `, ${ tag }`;
		} );

		delval.ids.forEach( function ( id ) {
			selector += `, #${ id }`;
		} );

		delval.classes.forEach( function ( thisclass ) {
			selector += `, .${ thisclass }`;
		} );

		return selector;
	}() ).remove();

	const countText = $countHTML.text().replace( /\n/g, '' );

	wikitext.replace( /<ref.*?>.*?<\/ref>/gi, '' );

	const refs = {
		wt: ( wikitext.match( /<ref.*?>.*?<\/ref>/gi ) || [] ).map( function ( x, i ) {
			return [ String( i ), x ];
		} ),
		$ele: $parseHTML.find( 'ol.references' )
	};
	refs.$ele.find( '.mw-cite-backlink' ).remove();

	const elements: elementsTS = {
		intLinks: wikitext.match( /\[\[.*?\]\]/g ),
		refs: {
			all: refs,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			default: refs.wt.filter( function ( [ _i, x ] ) {
				return !/group=/i.test( String( x ) );
			} ),
			$references: refs.$ele.filter( function ( _i, ele ) {
				return !!$( ele ).find( 'a' ).length;
			} ),
			$disallowed: refs.$ele.filter( function ( _i, ele ) {
				return !!$( ele ).html().match( /baike.baidu.com|百度|quora.com|toutiao.com|pincong.rocks|zhihu.com|知乎/ );
			} ),
			$unreliable: refs.$ele.filter( function ( _i, ele ) {
				return !!$( ele ).html().match( /百家[号號]|baijiahao.baidu.com|bigexam.hk|boxun.com|bowenpress.com|hkgpao.com|peopo.org|qyer.com|speakout.hk|songshuhui.net|youtube.com|youtu.be|acfun.cn|bilibili.com/ );
			} )
		},
		cats: wikitext.match( /\[\[(?:[Cc]at|[Cc]ategory|分[类類]):/gi ) || []
	};

	const contentLen = countText.length - ( countText.match( /\p{L}/i ) ? countText.match( /\p{L}/i ).length : 0 ) * 0.5;
	if ( contentLen === 0 ) {
		issues.push( 'size-zero' );
	} else if ( contentLen <= 50 ) {
		issues.push( 'substub' );
	} else if ( contentLen <= 220 ) {
		issues.push( 'stub' );
	} else if ( contentLen >= 15000 ) {
		issues.push( 'lengthy' );
	}

	if ( !/\[\[|\{\{|\{\||==|<ref|''|<code|<pre|<source|\[http|\|-|\|}|^[*#]/.test( wikitext ) ) {
		issues.push( 'wikify' );
	}

	if ( elements.refs.$references.length === 0 && elements.refs.all.$ele.length === 0 ) {
		issues.push( 'unreferenced' );
	} else {
		if ( elements.refs.$references.length < Math.min( Math.ceil( contentLen / 300 ) + 0.1, 20 ) ) {
			issues.push( 'ref-improve' );
		}

		if ( elements.refs.$disallowed.length ) {
			issues.push( 'ref-disallowed' );
		}

		if ( elements.refs.$unreliable.length ) {
			issues.push( 'ref-unreliable' );
		}

		if (
			elements.refs.$unreliable.length + elements.refs.$disallowed.length >=
			elements.refs.$references.length * 0.5
		) {
			issues.push( 'need-rs' );
		}
	}

	if ( elements.cats.length === 0 ) {
		issues.push( 'uncategorized' );
	}

	const em = wikitext
		.replace( /<ref.*?<\/ref>/g, '' )
		.match( /(?:''|<(?:em|i|b)>|【)(?:.*?)(?:''|<\/(?:em|i|b)>|】)/g ) || [];
	const emCnt = em.length;
	if ( emCnt > ( wikitext.match( /==(?:.*?)==/g ) || [] ).length ) {
		issues.push( 'over-emphasize' );
	}

	if (
		wikitext.split( '\n' ).filter( function ( x ) {
			return x.match( /^\s+(?!$)/ );
		} ).length &&
		$parseHTML.find( 'pre' ).filter( function ( _i, ele ) {
			const parent = $( ele ).parent().get( 0 );
			return Array.from( parent.classList ).indexOf( 'mw-0highlight' ) > -1;
		} ).length
	) {
		issues.push( 'bad-indents' );
	}

	return {
		issues,
		elements
	};
}

export const issuesData = {
	'size-zero': {
		short: '疑似只有模板及表格',
		long: '內容只包括外部链接、参见、图书参考、分类、模板、跨语言链接的条目（[[WP:D|消歧義頁]]、[[WP:R|重定向]]、[[WP:SRD|軟重定向]]除外）。'
	},
	'substub': {
		short: '[小小作品](https://zhwp.org/WP:SUBSTUB)，內容少於50字元',
		long: "'''內容過於短小，屬於[[WP:SUBSTUB|小小作品]]類別的草稿。'''小小作品可被[[WP:AFD|提請刪除]]，因此本專題不會接受小小作品的草稿，請擴充內容後再遞交。"
	},
	'stub': {
		short: '[小作品](https://zhwp.org/WP:STUB)',
		long: "'''內容短小，屬於[[WP:STUB|小作品]]類別的草稿。'''建議補充更多的資訊，擴充內容後再遞交。謹記內容必須符合[[WP:NOR|非原創研究]]、[[WP:V|可供查證]]等方針，在擴充內容的同時要提供相應的[[WP:RS|可靠來源]]。"
	},
	'lengthy': {
		short: '[內容過長](https://zhwp.org/WP:LENGTH)',
		long: "'''[[WP:LENGTH|內容過長]]'''，草稿內容可能需要分拆。"
	},
	'wikify': {
		short: '欠缺[維基化](https://zhwp.org/WP:WIKIFY)',
		long: "'''草稿缺乏[[WP:WIKIFY|維基化]]。'''請加入適量的格式，例如條目名稱首次出現時加粗、補充[[Help:链接|內部連結]]等。"
	},
	'unreferenced': {
		short: '沒有附上來源',
		long: "'''草稿沒有附上任何[[WP:SOURCE|來源]]，或沒有使用[[H:FOOT|文內引註]]而使來源仍然不明。'''請補充適當的[[WP:RS|可靠來源]]，以讓內容符合[[WP:V|可供查證]]方針。"
	},
	'ref-improve': {
		short: '缺少來源（總長度/200）',
		long: "'''草稿可能缺少[[WP:SOURCE|來源]]。'''請補充適當的[[WP:RS|可靠來源]]，以讓內容符合[[WP:V|可供查證]]方針。"
	},
	'ref-disallowed': {
		short: '包含禁用的不可靠來源',
		long: "'''草稿包含[[WP:RS/P|已表列禁用的不可靠來源]]。'''請移除不可靠來源，並補充適當的[[WP:RS|可靠來源]]。"
	},
	'ref-unreliable': {
		short: '包含不建議使用的不可靠來源',
		long: "'''草稿包含[[WP:RS/P|已表列不建議使用的不可靠來源]]。'''請儘量避免使用已表列不建議使用的不可靠來源，並以[[WP:RS|可靠來源]]取代。"
	},
	'need-rs': {
		short: '缺少可靠來源，不可靠來源佔來源數過半',
		long: "'''草稿缺乏[[WP:RS|可靠來源]]，不可靠來源佔來源數過半。'''請儘量以可靠來源取代不可靠來源。"
	},
	'uncategorized': {
		short: '沒有加入分類',
		long: "'''草稿缺乏[[WP:CAT|分類]]。'''請注意在草稿中加入分類時，<nowiki>[[</nowiki>Category:分类<nowiki>]]</nowiki>应当以<nowiki>[[:</nowiki>Category:分类<nowiki>]]</nowiki>（Category前加半角冒号）取代，或使用<nowiki></nowiki>包裹。"
	},
	'over-emphasize': {
		short: '[過度使用強調格式](https://zhwp.org/MOS:OEM)',
		long: "'''草稿[[MOS:OEM|過度使用強調格式]]（包括但不限於粗體、斜體、粗方括號等）。'''請清理草稿的格式，只在有明確需要的情況下使用強調格式，不要濫用格式來強調內容。"
	},
	'bad-indents': {
		short: '不當縮排',
		long: "'''草稿包含不當使用縮排空格。'''維基百科內容的段落不需要加入空格作縮排，請移除；在段首使用半形空格同時會破壞頁面格式。"
	},
	'copyvio': {
		short: '可能包含侵權內容',
		long: "'''草稿可能包含[[WP:COPYVIO|侵犯版權]]的內容。'''一旦確認後，侵權內容將被刪除。請移除侵權內容，並以自己的文字重寫內容。"
	},
	'same-name': {
		short: "提交者與頁面同名",
		long: "'''提交者用戶名與草稿相同。'''維基百科不允許任何個人、團體或公司利用維基百科進行宣傳。根據[[WP:UN|用戶名方針]]，使用[[WP:IU|誤導性或宣傳性用戶名]]均被禁止。'''如果您的用戶名為團體或公司的名稱，請[[WP:UNC|更改用戶名]]，否則您的帳號可能會被封鎖；如果您是在撰寫您的自傳，請閱讀相關[[WP:自傳|方針]]。"
	},
	"same-name-creator": {
		short: "建立者與頁面同名",
		long: ""
	},
	"default-wikitext": {
		short: "頁面尚有預設內容",
		long: "'''頁面尚有預設內容'''，包括「此处改为条目主题」、「章节标题」等。請儘快替換或清理有關內容。"
	}
};