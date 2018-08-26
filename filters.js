"use strict";

/*
 * s.getService("Filters")("Filtername");
 */

s.registerFilter('allForWhich', function(prop) {
    if (prop[0] === "!") {
        prop = prop.substring(1);
        return function(arr) {        
            for (var i = 0; i < arr.length; i++) {
                if (arr[i][prop]) {
                    arr.splice(i, 1);
                    i--;
                }
            }
            return arr;
        }
    }
    return function(arr) {        
        for (var i = 0; i < arr.length; i++) {
            if (!arr[i][prop]) {
                arr.splice(i, 1);
                i--;
            }
        }
        return arr;
    }
});


s.registerFilter('allMatchToDate', function(prop, date) {
    date = date || new Date();
    return function(arr) {        
        for (var i = 0; i < arr.length; i++) {
            if (dates.dateDifference(arr[i][prop] * 1000, date) !== 0) {
                arr.splice(i, 1);
                i--;
            }
        }
        return arr;
    }
});


s.registerFilter('sortedFilter', function(sortprop, search_str) {
    
    return function(dataArr) {
        if (!search_str || !search_str.length)
            return dataArr;
        
        search_str = search_str.toLowerCase();
        var re = new RegExp("^" + search_str, 'i');
        
        dataArr = util.filterMatching(dataArr, compare);
        
        function compare(a) {
            var str = a[sortprop].toLowerCase();
            if (re.test(str)) {
                return 0;
            }
            if (str < search_str)
                return -1;
            if (str > search_str)
                return 1;
            return 0;
        }
        
        return dataArr;
        
    };
    
});


s.registerFilter('trimDecimals', function() {
    return function(hinta) {
        if (hinta === undefined || hinta === null)
            return "";
        hinta = parseFloat(hinta).toFixed(2);
        hinta = hinta.replace('.', ',');
        return hinta;
    };
});

s.registerFilter('hinta', function() {
    return function(hinta) {
        if (hinta === undefined || hinta === null)
            return "";
        var sign = hinta < 0 ? " - " : "";
        var res = parseFloat(Math.abs(hinta)).toFixed(2);
        res = res.replace('.', ',');
        res = sign + res + " €";
        return res;
    };
});

s.registerFilter('neghinta', function() {
    return function(hinta) {
        if (hinta === undefined || hinta === null)
            return "";
        hinta = -hinta;
        var sign = hinta < 0 ? " - " : "";
        var res = parseFloat(Math.abs(hinta)).toFixed(2);
        res = res.replace('.', ',');
        res = sign + res + " €";
        return res;
    };
});

s.registerFilter('pros', function() {
    return function(pros) {
        pros = parseFloat(pros).toFixed(0);
        if (isNaN(pros))
            return "";
        pros += "%";
        return pros;
    };
});

s.registerFilter('date', function() {
    return function(date) {
        if (!date)
            return "";
        if (!s.isDate(date)) {
            date = new Date(date*1000);
        }
        return date.getDate() + "." + (date.getMonth()+1) + "." + date.getFullYear();
        
    };
});

s.registerFilter('datetime', function() {
    function pad(value) {
        return value < 10 ? "0" + value : value;
    }
    return function(date) {
        if (!date)
            return "";
        if (!date.getTime)
            date = new Date(date*1000);
        return date.getDate() + "." + (date.getMonth()+1) + "." + date.getFullYear() + 
                " " + pad(date.getHours()) + ':' + pad(date.getMinutes());
    };
});

s.registerFilter('boolean', function() {
    return function(value) {
        var vastaus = value ? "Kyllä" : "Ei";
        return vastaus;
    };
});

s.registerFilter('isOne', function() {
    return function(value) {
        if (value === 1)
            return true;
        return false;
    };
});


/************* Filterit *********************/

//left pads a string with zeros up to a length. Adds an lpad property to the object.
//Todo: change it so that it won't add any extra properties. You can inject $filter
/*
 * kTek.filter('lpad', function() {
    return function(lista, length, objectProperty) {
        angular.forEach(lista, function(objekti, indeksi) {
            if (typeof objekti[objectProperty] === 'undefined')
                return; //has no such property as objectProperty, maybe due to server request
            if (objekti[objectProperty].length < length) {
                var lisa = length - objekti[objectProperty].length;
                objekti['lpad'] = new Array(lisa + 1).join("0") + objekti[objectProperty];
            }
        });
        return lista;
    }
});



kTek.filter('sublist', function() {
    return function(input, start, end) {
        if (!angular.isArray(input) && !angular.isString(input))
            return input;

        start = parseInt(start);
        end = parseInt(end);

        if (angular.isString(input)) {
            //NaN check on start
            if (start && end) {
                return input.slice(start, end);
            } else {
                return "";
            }
        }

        var out = [],
                i, n;

        // if abs(start) exceeds maximum length, trim it
        if (end > input.length)
            end = input.length;
        else if (end < 0)
            end = 0;
        if (start > input.length)
            start = input.length;
        else if (start < 0)
            start = 0;

        i = start;
        n = end;

        for (; i < n; i++) {
            out.push(input[i]);
        }

        return out;
    }
});

*/