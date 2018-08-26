
s.registerService("Dates", function() {

    var api = {
        parseDATE: function(datestr) {
            if (typeof datestr != 'string')
                throw new Error("apu.parseDATE: datestr argument " + datestr + " was not a string!");
            var y = parseInt(datestr.substr(0, 4));
            var M = parseInt(datestr.substr(5, 2)) - 1;
            var d = parseInt(datestr.substr(8, 2));
            var date = new Date(y, M, d, 0, 0, 0, 0);
            if (isNaN(date.getTime()))
                throw new Error("apu.parseDATE: datestr argument " + datestr + " wasn't a MySQL DATE");
            return date;
        },
        parseDATETIME: function(datestr) {
            if (typeof datestr != 'string')
                throw new Error("apu.parseDATE: datestr argument " + datestr + " was not a string!");
            var y = parseInt(datestr.substr(0, 4));
            var M = parseInt(datestr.substr(5, 2)) - 1;
            var d = parseInt(datestr.substr(8, 2));
            var h = parseInt(datestr.substr(11, 2));
            var m = parseInt(datestr.substr(14, 2));
            var s = parseInt(datestr.substr(17, 2));
            var date = new Date(y, M, d, h, m, s, 0);
            if (isNaN(date.getTime()))
                throw new Error("apu.parseDATE: datestr argument " + datestr + " wasn't a MySQL DATETIME");
            return date;
        },
        toDATETIME: function(date) {
            var toPadStr = function(val) {
                var ret = val > 9 ? val.toString() : '0' + val.toString();
                return ret;
            }
            var y = date.getFullYear();
            var M = toPadStr(date.getMonth() + 1);
            var d = toPadStr(date.getDate());
            var h = toPadStr(date.getHours());
            var m = toPadStr(date.getMinutes());
            var s = toPadStr(date.getSeconds());
            return y + '-' + M + '-' + d + ' ' + h + ':' + m + ':' + s;
        },
        toDATE: function(date) {
            var toPadStr = function(val) {
                var ret = val > 9 ? val.toString() : '0' + val.toString();
                return ret;
            }
            var y = date.getFullYear();
            var M = toPadStr(date.getMonth() + 1);
            var d = toPadStr(date.getDate());
            return y + '-' + M + '-' + d;
        },
        /*Vertaa päivämääriä periaatteella 31.5.2013 - 31.5.2013 = 0*/
        dateDifference: function(fromDate, toDate) {
            if (!fromDate || !toDate)
                return undefined;
            fromDate = new Date(fromDate);
            toDate = new Date(toDate);
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()))
                return undefined;

            //perform calculations
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(0, 0, 0, 0);
            var diff = (fromDate < toDate) ? new Date(toDate - fromDate) : new Date(fromDate - toDate);
            if (fromDate <= toDate)
                return (Math.floor(diff.getTime() / (1000 * 60 * 60 * 24)));
            else
                return (-Math.floor(diff.getTime() / (1000 * 60 * 60 * 24)));
        },
        setByMins: function(date, min) {
            date.setHours(0, min, 0, 0);
            return date;
        },
        setByDays: function(date, days, min) {
            return this.setByMins(date, days * 24 * 60 + min);
        },
        reformat: function(datestr, fromFormat, toFormat) {
            //assumes fromFormat: d.m.Y format
            //toFormat Y-mm-dd
            var parts = datestr.split('.');
            if (parts.length < 3)
                return '0000-00-00';
            if (parts[0] < 10)
                parts[0] = '0' + parts[0];
            if (parts[1] < 10)
                parts[1] = '0' + parts[1];
            return parts[2] + '-' + parts[1] + '-' + parts[0];
        },
        format: function(milliseconds, formatstr) {
            if (!formatstr) {
                formatstr = 'd.m.Y';
            }
            var formattedDate = '',
                    dateObj = new Date(milliseconds),
                    format = {
                d: function() {
                    var day = format.j();
                    //return (day < 10) ? '0' + day : day;
                    return day;
                },
                D: function() {
                    return config.weekdays[format.w()].substring(0, 3);
                },
                j: function() {
                    return dateObj.getDate();
                },
                //l: function() {
                //    return config.weekdays[format.w()];
                //},
                //S: function() {
                //    return config.suffix[format.j()] || config.defaultSuffix;
                //},
                w: function() {
                    return dateObj.getDay();
                },
                //F: function() {
                //    return monthToStr(format.n(), true, config.months);
                //},
                m: function() {
                    var month = format.n() + 1;
                    //return (month < 10) ? '0' + month : month;
                    return month;
                },
                //M: function() {
                //    return monthToStr(format.n(), false, config.months);
                //},
                n: function() {
                    return dateObj.getMonth();
                },
                Y: function() {
                    return dateObj.getFullYear();
                },
                y: function() {
                    return format.Y().toString().substring(2, 4);
                }
            },
            formatPieces = formatstr.split('');

            s.foreach(formatPieces, function(formatPiece, index) {
                if (format[formatPiece] && formatPieces[index - 1] != '\\') {
                    formattedDate += format[formatPiece]();
                } else {
                    if (formatPiece != '\\') {
                        formattedDate += formatPiece;
                    }
                }
            });

            return formattedDate;
        },
    };

    return api;
})