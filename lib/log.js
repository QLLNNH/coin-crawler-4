'use strict';

exports.info = (info) => {
    if (typeof info === 'string') console.log(`${new Date().toISOString()} => ${info}`);
    else console.log(JSON.stringify(info));
}

exports.error = (info) => {
    if (typeof info === 'string') console.error(`${new Date().toISOString()} => ${info}`);
    else console.error(JSON.stringify(info));
}