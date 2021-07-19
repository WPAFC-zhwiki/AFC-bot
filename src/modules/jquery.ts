import { JSDOM } from 'jsdom'
import jquery from 'jquery'

const win = new ( JSDOM )( '' ).window;

const $: typeof jquery = jquery( win, true )
export default $;