'use strict';
function boot(config) {
    const VtexRequest = require('./vtexrequest.class');
    const File        = require('./file.class');
    const json2csv    = require('json2csv');
    const fs          = require('fs');
    const path        = require('path');
    const dataRange   = require('./daterange')(config.daterange);

    let timing = {
        start : new Date()
    };

    timing.startTimeStamp = timing.start.getTime();

    let clientes = 0;
    let produtos = 0;
    let pedidos  = 0;

    let r = new VtexRequest(
        config.apptoken,
        config.appkey,
        config.subdomain,
        12000,
        '',
        false
    );

    let ordersFilePath   = `${config.filepath}/${config.file_prefix}orders.csv`;
    let productsFilePath = `${config.filepath}/${config.file_prefix}products.csv`;
    let clientsFilePath  = `${config.filepath}/${config.file_prefix}clients.csv`;
    let orderErrorsFP    = `${config.filepath}/${config.file_prefix}orderErrors.txt`;

    let createOldFiles = (files, callback) => {
        let oldFile     = files.shift();
        let fileName    = oldFile.substr(oldFile.lastIndexOf('/') + 1);
        let oldDirs     = oldFile.replace(fileName, '');
        let newDirs     = oldDirs + 'old/';

        let newFile = newDirs + fileName;
        oldFile     = oldDirs + fileName;

        fs.stat( newDirs, (err, stats) => {
            if ( err && ( err.code === 'ENOENT') ){
                fs.mkdirSync(newDirs, 754, true);
            }

            fs.stat( oldFile, (err, stats) => {
                if ( !(err &&  err.code === 'ENOENT') ){
                    fs.renameSync( oldFile, newFile );
                }

                if (files.length){
                    createOldFiles(files, callback);
                }
                else{
                    callback();
                }
            });
        });
    }

    createOldFiles([ordersFilePath, productsFilePath, clientsFilePath, orderErrorsFP], () => {
        let ordersFile       = new File( ordersFilePath, timing.startTimeStamp );
        let productsFile     = new File( productsFilePath, timing.startTimeStamp );
        let clientsFile      = new File( clientsFilePath, timing.startTimeStamp );

        let OEFileName       = orderErrorsFP.substr(orderErrorsFP.lastIndexOf('/') + 1);
        let orderErrorsFile  = orderErrorsFP.replace( OEFileName, '') + OEFileName;


        r.getOrderIds(
            dataRange.ini,
            dataRange.end,
            function(err, data) { // Callback com todos os pedidos
                timing.end  = new Date();
                let endms   = timing.end.getTime();
                let startms = timing.start.getTime();
                let minutes = Math.round(((endms - startms)/1000)/60);
                console.log(`Pedidos baixados em ${minutes.toFixed(2)} minutos.`);
             },

            function(data){
                if (data && !data.error && data.list) {
                    let orders = data.list;
                    orders.forEach( (order) => {

                        r.getOrder(order.orderId, function(err, pedido){
                            if (err){
                                fs.appendFile(orderErrorsFile, order.orderId + '\n');
                            }

                            else if (pedido && pedido.clientProfileData) {
                                pedido.userProfileId = pedido.clientProfileData.userProfileId;

                                clientsFile.writeLine(pedido.clientProfileData); //salva o pedido no arquivo
                                delete pedido.clientProfileData; //remove cliente do pedido

                                pedido.items.forEach((produto) => {
                                    produto.orderId = pedido.orderId;
                                    productsFile.writeLine(produto); //salva o produto no arquivo
                                    produtos++;
                                });

                                delete pedido.items; //remove produtos do pedido

                                ordersFile.writeLine(pedido); //salva o produto no arquivo

                                pedidos++;
                                clientes++;

                                let lines = process.stdout.getWindowSize()[1];
                                for(let i = 0; i < lines; i++) console.log('\r\n');
                                console.log(`# EXTRAÇÃO ${config.subdomain.toUpperCase()} EM ANDAMENTO #\n`);
                                console.log(`pedidos: ${pedidos}`);
                                console.log(`clientes: ${clientes}`);
                                console.log(`produtos: ${produtos}`);
                            }
                        });
                    });
                }
                else {
                    console.log('Status Code', data.statusCode);
                    console.log('Path', data.req.path);
                    console.log('Error', data);
                }
            }
        );
    });
}

module.exports = boot;
