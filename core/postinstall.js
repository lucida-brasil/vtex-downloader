'use strict';

const fs      = require('node-fs');
const path    = require('path');
const config  = require('../package.json').config;
const projdir = path.resolve(__dirname, '../');

for (let key in config) {
    fs.mkdirSync(
        path.resolve(projdir, config[key].filepath),
        754, true
    );
}
