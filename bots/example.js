'use strict';
const config = require('../package.json').config.example;
const boot   = require('../core/boot');

console.log('# Iniciando extração VTEX Boticario #');
boot(config);
