'use strict';

const fs       = require('node-fs');
const json2csv = require('json2csv');
const path     = require('path');

class File {
    constructor(filePath, timestamp) {
        this.timestamp = timestamp;
        this.header    = false;

        //Separa o nome do arquivo do diretório
        let fileName = filePath.substr(filePath.lastIndexOf('/') + 1);
        let dirs     = filePath.replace(fileName, '') + 'data/';
        
        //Salva o caminho do arquivo com o diretório correto no path
        this.path    = path.resolve(dirs + fileName);

        // Verifica se os diretorios não estão criados e os cria
        fs.stat( dirs, (err, stats) => {
            if ( err && ( err.code === 'ENOENT') ){
                fs.mkdirSync(dirs + 'old/', 754, true);
            }
            
            //Finalmente cria o arquivo
            fs.writeFileSync(this.path, '');
        });
    }

    writeLine(data) {
        data.lucida_timestamp = this.timestamp;

        let fields = Object.keys(data);

        json2csv({ data: data, fields: fields, del: '\t'}, (err, csv) => {
            if (err) throw new Error(err);

            if( this.header ){
                csv = csv.substring( csv.indexOf('\n'));
            } else {
                this.header = true;
            }

            fs.appendFileSync(this.path, csv);
        });
    }
}

module.exports = File;

