require('dotenv').config()

const { dcBot, tgBot, DCREVCHN, TGREVGRP } = require( './util/bots' );
const fs = require( 'fs' )
    , moment = require( 'moment' );

const fn = require(process.cwd() + "/util/fn.js")
    , logger = require(process.cwd() + "/modules/logger.js");

require( './modules/icg/main' );
require( './modules/events' );

