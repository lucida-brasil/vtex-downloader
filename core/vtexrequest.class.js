'use strict';

let fs       = require('fs');
let json2csv = require('json2csv');
let moment   = require('moment');
let request  = require('request');

require('prototype-pluck');

class VtexRequest {
    constructor(apptoken, appkey, subdomain, saleschannel, timeout, status, debug) {
        this.subdomain    = subdomain;
        this.saleschannel = saleschannel;
        this.debug        = debug;
        this.dateformat   = 'YYYY-MM-DDTHH:mm:ss.000[Z]';
        this.timeout      = timeout;
        this.status       = status;
        this.host         = `http://${subdomain}.vtexcommercestable.com.br/api/oms/pvt/`;
        this.token        = apptoken;
        this.key          = appkey;
        this.headers      = {
                'x-vtex-api-apptoken': apptoken,
                'x-vtex-api-appkey': appkey
            };
    }

    getOrderIds(startdate, enddate, callback, cbeach) {

        /** VALIDAÇÃO DE ARGUMENTOS **/
        if ( 'function' === typeof startdate ) {

            if ( 'function' === typeof enddate ) {
                cbeach = enddate;
            }

            let now   = new Date();
            callback  = startdate;
            startdate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                0, 0, 0
            );

            enddate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                23, 59, 59
            );
        }

        if ( !(startdate instanceof Date) ) {
            throw 'O primeiro argumento deve ser objeto Date ou function';
        }

        if ( !(enddate instanceof Date) ) {
            throw 'O segundo argumento deve ser objeto Date';
        }

        if ( 'funciton' === typeof callback ) {
            throw 'O callback é obrigatório';
        }

        if (this.debug) {
            console.log(`Iniciando busca de orderIds entre ${startdate} e ${enddate}\n`);
        }

        /** CONSTRUÇÃO DO REQUEST **/
        startdate = moment(startdate).format(this.dateformat);
        enddate   = moment(enddate).format(this.dateformat);

        let options = {
                method: 'GET',
                url: `${this.host}orders/`,
                qs : {
                    f_salesChannel: this.saleschannel,
                    page: 1,
                    per_page : 50,
                    f_creationDate : `creationDate:[${startdate} TO ${enddate}]`,
                },
                headers: this.headers,
                timeout: this.timeout
            };

        if ( this.status ) options.qs.f_status = this.status;

        let list = [];

        /** REQUEST **/
        let requestcb = (err, response, data) => {
            let paging;
            if (err && ( err.code === "ENOTFOUND" || err.code ==='ETIMEDOUT' || err.code ==='ESOCKETTIMEDOUT' ) ) {
                console.log("Erro de conexão: Não foi possível buscar a página. Tentando novamente em 5 segundos");
                setTimeout( () => {
                    request(options, requestcb);
                }, 5000)
            }
            else if (err) callback(err);

            else if (response.statusCode !== 200) {
                let e = {
                    message: `Erro na requisição\nstatus${response.statusCode}`,
                    statusCode: response.statusCode,
                    req: response.req
                };
                callback(e);
                cbeach(e);
            }

            else if (data) {
                data = JSON.parse(data);
                paging = data.paging;

                if(this.debug) {

                    if (options.qs.page===1) {
                        console.log(`${paging.total} pedidos encontrados`);
                        console.log(`${paging.perPage} por página`);
                        console.log(`${paging.pages} páginas\n`);
                    }

                    console.log(
                        `concluído request ${paging.currentPage} de ${paging.pages}`
                    );
                }

                if (cbeach && 'function' === typeof cbeach) {
                    cbeach(data);
                }

                list = list.concat(data.list.pluck('orderId'));

                if ( paging.currentPage < paging.pages ) {
                    options.qs.page = options.qs.page+1;
                    request(options, requestcb);
                }
                else {
                    callback(null, list);
                }
            }
            else{
                callback(err, list);
            }
        };

        request(options, requestcb);
        //console.log(options);
    }

    getOrder(id, callback) {
        /** VALIDAÇÃO DE ARGUMENTOS **/
        if ( !id || 'string' !== typeof id ) {
            throw 'Id deve ser uma string';
        }

        if ( 'funciton' === typeof callback ) {
            throw 'O callback é obrigatório';
        }


        /** CONSTRUÇÃO DO REQUEST **/
        let options = {
                method: 'GET',
                url: `${this.host}orders/${id}`,
                headers: this.headers,
                timeout: this.timeout,
                qs: {
                    f_salesChannel: this.saleschannel
                }
            };

        /** REQUEST **/
        if (this.debug) {
            console.log(
                `Iniciando request ${options.url}`
            );
        }

        let requestcb = (err, response, data) => {
            if (response && response.statusCode !== 200) {
                let e = {
                    error: `Erro na requisição status${response.statusCode}`,
                    statusCode: response.statusCode,
                    req: response.req
                };
                callback(e);
            }
            else if (err && ( err.code === "ENOTFOUND" || err.code ==='ETIMEDOUT' || err.code ==='ESOCKETTIMEDOUT' ) ) {
                console.log("Erro de conexão: Não foi possível buscar o pedido. Tentando novamente em 5 segundos");
                setTimeout( () => {
                    request(options, requestcb);
                }, 5000)
            }
            else if (err) callback(err);

            else if (data) {
                data = JSON.parse(data);
                callback(null, data);
            }
            else callback();
        }

        request(options, requestcb);
    }

    getOrdersByDate(startdate, enddate, callback, cbeach) {

        if ( 'function' === typeof startdate ) {
            callback = startdate;
            startdate = enddate = null;
        }

        let orders = [];
        let getOrdersRecursive = (list) => {
            if(this.debug){
                console.log(
                    `${list.length} requests pendentes`
                );
            }
            let id = list.shift();
            let recursivecb = (err, data) => {
                if (!err && data) {
                    orders.push(data);

                    if (cbeach && 'function' === typeof cbeach) cbeach(data);

                    if (list.length > 0) {
                        getOrdersRecursive(list, recursivecb);
                    }
                    else {
                        callback(null, orders);
                    }
                }
                else callback(err, orders);
            };

            this.getOrder(id, recursivecb);

        }
        let orderscallback = (err, data) => {
                if (!err && data) getOrdersRecursive(data)
                else callback(err);
            };


        if (startdate && enddate) {
            this.getOrderIds(startdate, enddate, orderscallback);
        }
        else this.getOrderIds(orderscallback);

    }
}


module.exports = VtexRequest;
