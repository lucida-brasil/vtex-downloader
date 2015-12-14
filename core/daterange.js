'use strict';

function daterange(range) {
    range = range || 0;
    let ini, end;
    if(range === 0) {
        end = new Date();
        ini = new Date();
        ini.setDate(ini.getDate() -1);
    }
    else {
        let now   = new Date();
        let day   = now.getDate();
        let month = now.getMonth();
        let year  = now.getFullYear();

        end = new Date(year, month, day -1, 23, 59, 0);
        ini = new Date(year, month, day, 0, 0, 0);
        ini.setDate(day - range - 1);
    }
    return {ini, end};
}

module.exports = daterange;
