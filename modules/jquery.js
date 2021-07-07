const window = new ( require( 'jsdom' ).JSDOM )( '' ).window;

module.exports = require( 'jquery' )( window, true );