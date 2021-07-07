const fs = require( 'fs' );
const yaml = require( 'js-yaml' );
const logger = require( process.cwd() + '/modules/logger' )

// 用于加载配置文件
const isFileExists = ( name ) => {
	try {
		fs.accessSync( name, fs.constants.R_OK );
		return true;
	} catch ( err ) {
		return false;
	}
};

// 加载配置文件
const loadConfig = ( name ) => {
	// 优先读取yaml格式配置文件
	if ( isFileExists( process.cwd() + `/modules/icg/${ name }.yml` ) ) {
		return yaml.load( fs.readFileSync( process.cwd() + `/modules/icg/${ name }.yml`, 'utf8' ) );
	} else if ( isFileExists( process.cwd() + `/modules/icg/${ name }.yaml` ) ) {
		return yaml.load( fs.readFileSync( process.cwd() + `/modules/icg/${ name }.yaml`, 'utf8' ) );
	} else if ( isFileExists( process.cwd() + `/modules/icg/${ name }.js` ) ) {
		logger.warn( `* DEPRECATED: ${ name }.js format is deprecated, please use yaml format instead.` );
		return require( process.cwd() + `/modules/icg/${ name }.js` );
	} else if ( isFileExists( process.cwd() + `/modules/icg/${ name }.json` ) ) {
		logger.warn( `* DEPRECATED: ${ name }.json format is deprecated, please use yaml format instead.` );
		return require( process.cwd() + `/modules/icg/${ name }.json` );
	} else {
		return null;
	}
};

const getFriendlySize = ( size ) => {
	if ( size <= 1126 ) {
		return `${ size.toLocaleString() } B`;
	} else if ( size <= 1153433 ) {
		return `${ ( size / 1024 ).toLocaleString() } KB`;
	} else if ( size <= 1181116006 ) {
		return `${ ( size / 1048576 ).toLocaleString() } MB`;
	} else {
		return `${ ( size / 1073741824 ).toLocaleString() } GB`;
	}
};

const getFriendlyLocation = ( latitude, longitude ) => {
	let y = latitude;
	let x = longitude;

	y = y < 0 ? `${ -y }°S` : `${ y }°N`;
	x = x < 0 ? `${ -x }°W` : `${ x }°E`;

	return `${ y }, ${ x }`;
};

const copyObject = ( obj ) => {
	let r = {};
	for ( let a in obj ) {
		r[ a ] = obj[ a ];
	}
	return r;
};

module.exports = {
	isFileExists,
	loadConfig,
	getFriendlySize,
	getFriendlyLocation,
	copyObject
};
