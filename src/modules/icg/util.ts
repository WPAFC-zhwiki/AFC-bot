import fs from 'fs'
import yaml from 'js-yaml'
import * as logger from 'src/modules/logger'

import { ConfigTS } from 'src/util/type';

// 用于加载配置文件
export const isFileExists = ( name ) => {
  try {
    fs.accessSync( name, fs.constants.R_OK );
    return true;
  } catch ( err ) {
    return false;
  }
};

// 加载配置文件
export const loadConfig: () => ConfigTS = () => {
  return yaml.load( fs.readFileSync( process.cwd() + `/src/modules/icg/config.yml`, 'utf8' ) );
};

export const getFriendlySize = ( size ) => {
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

export const getFriendlyLocation = ( latitude, longitude ) => {
  let y = latitude;
  let x = longitude;

  y = y < 0 ? `${ -y }°S` : `${ y }°N`;
  x = x < 0 ? `${ -x }°W` : `${ x }°E`;

  return `${ y }, ${ x }`;
};

export const copyObject = ( obj ) => {
  let r = {};
  for ( let a in obj ) {
    r[ a ] = obj[ a ];
  }
  return r;
};
