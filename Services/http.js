"use strict";

/**
 * @suoradoc service
 * @name sHttp
 * @description
 * Basic http service. Assumes that all data is passed and received in json. 
 * Provides an api for handling get, post, delete and put 
 * requests. Resets the cache if post, delete or put is used.
 * The api functions take on the following parameters:
 * 
 * @param {url} the url to connect to
 * @param {data} in json
 * @param {config} describing the request to be made and how it should be
 *    processed. The object has following properties:
 *
 *    - **method** – `{string}` – HTTP method (e.g. 'GET', 'POST', etc). Only used by request().
 *    - **url** – `{string}` – Absolute or relative URL of the resource that is being requested. Only used by request().
 *    - **params** – `{Object.<string|Object>}` – Map of strings or objects which will be turned to
 *      `?key1=value1&key2=value2` after the url. If the value is not a string, it will be JSONified.
 *    - **data** – `{string|Object}` – Data to be sent as the request message data.
 *    - **headers** – `{Object}` – Map of strings representing HTTP headers to send to the server.
 *    - **async** - `{boolean}` - Wether the request should be asynchronous or not. Default is true.
 *    - **success** - `{function(responsedata, status, config)}` - callback function
 *    - **error** - `{function(responsedata, status, config)}` - callback function
 *    - **cache** - $cacheFactory object
 *    - **updateCache** - if set then cache will be updated no matter if the request was cached before or not
 *    - **formatData** - callback function for formatting the data when received
 *    
 *   Success and errorfunctions are called with arguments:
 *                      data: json parsed response data,
 *                      status: statuscode. This is set to 'cached' if result was cached, null if the result hasn't arrived yet,
 *                      config: the provided config object
 */

s.registerService("Http", function() {
    var api = {};
    var defaultHeaders = {};
    var pendingAsyncRequests = [];
    var pendingCachedRequests = [];

    function formUrl(url, params) {
        var paramstr = "";
        var keys = params ? Object.keys(params) : [];
        keys.sort();
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (paramstr != "") {
                paramstr += "&";
            }
            paramstr += key + "=" + params[key];
        }
        var returl = (paramstr === "") ? url : url + "?" + paramstr;
        return returl;
    }
    
    function parse_response(text) {
        try {
            text = JSON.parse(text);
        }
        catch (e) {
            //don't change success because what matters is what the server says in status
            console.log('Http-service: response was not JSON');
        }
        return text;
    }

    function handleResponse(xmlhttp, config) {
        //dont do other changes to xmlhttp
        xmlhttp.onreadystatechange = null;
        
        var success = (xmlhttp.status >= 200 && xmlhttp.status < 300);
        var responseData = parse_response(xmlhttp.responseText);
            
        if (success && config.cache) {
            var method = config.method.toUpperCase();
            if (method === "GET") {
                var url = formUrl(config.url, config.params);
                config.cache.put(url, xmlhttp.responseText);
            }
            else if (method === "POST" || method === "DELETE" || method === "PUT") {
                config.cache.removeAll();
            }
        }
        
        if (config.formatData)
            responseData = config.formatData(responseData);
        
        return({
            data: responseData,
            config: config,
            status: xmlhttp.status,
            success: success,
        });
    }
    
    function executeCallbacks(respObj) {
        if (respObj.success && respObj.config.success)
            respObj.config.success(respObj.data, respObj.status, respObj.config);
        else if (!respObj.success && respObj.config.error)
            respObj.config.error(respObj.data, respObj.status, respObj.config);
    }

    function resolvePendingAsyncRequest(event) {
        var xhr = event.currentTarget;

        if (xhr.readyState === 4) {

            for (var i = 0; i < pendingAsyncRequests.length; i++) {
                if (pendingAsyncRequests[i].xhr === xhr) {         
                    break;
                }
            }
            
            var pendingObj = pendingAsyncRequests.splice(i, 1)[0];
            var r_objs = pendingObj.responseObjArray;
            for (var k = 0; k < r_objs.length; k++) {
                var respObj = r_objs[k];
                s.extend(respObj, handleResponse(xhr, respObj.config));
                executeCallbacks(respObj);            
            }
            
            
        }
    }
    
    function addToPendingAsync(url, responseObj) {
        var config = responseObj.config;
        
        if (!config.async || config.method.toUpperCase() !== 'GET')
            return false;
        
        for (var i = 0; i < pendingAsyncRequests.length; i++) {
            if (url == pendingAsyncRequests[i].url) {
                if (pendingAsyncRequests[i].responseObjArray[0].config.method.toUpperCase() !== 'GET')
                    continue;
                pendingAsyncRequests[i].responseObjArray.push(responseObj);
                return true;
            }
        }
        return false;
    }

    function resolvePendingCachedRequests() {
        var responseObj = pendingCachedRequests.pop();
        while (responseObj) {
            executeCallbacks(responseObj);
            responseObj = pendingCachedRequests.pop();
        }
    }



    api.request = function(config) {
        var responseObj = {
            config: config,
            data: {},
            status: null,
            success: undefined
        };
        
        if (typeof config.async === 'undefined')
            config.async = true;
        
        var url = formUrl(config.url, config.params);
        
        //handle caching behaviour
        if (config.cache && config.method.toUpperCase() === 'GET' && config.cache.get(url)) {
            
            responseObj.data = parse_response(config.cache.get(url));
            
            if (config.formatData)
                responseObj.data = config.formatData(responseObj.data);
            
            responseObj.status = 'dirty';
            
            if (!config.updateCache) {
                responseObj.status = 'cached';
                responseObj.success = true;
                if (config.success && config.async) {
                    pendingCachedRequests.push(responseObj);
                    setTimeout(resolvePendingCachedRequests, 0);
                }
                else if (config.success && !config.async)
                    config.success(responseObj.data, responseObj.status, responseObj.config);

                return responseObj;
            }
        }
        
        //control equivalent requests
        if (addToPendingAsync(url, responseObj))
            return responseObj;
        
        //prepare the request
        var xmlhttp = new XMLHttpRequest();

        xmlhttp.open(config.method, url, config.async);
        xmlhttp.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        config.headers = config.headers || {};
        
        for (var key in defaultHeaders) {
            if (!defaultHeaders.hasOwnProperty(key) || typeof config.headers[key] !== "undefined")
                continue;
            config.headers[key] = defaultHeaders[key];
        }
        for (var key in config.headers) {
            if (!config.headers.hasOwnProperty(key))
                continue;
            xmlhttp.setRequestHeader(key, config.headers[key]);
        }
        
        if (config.async) {  
            pendingAsyncRequests.push({
                responseObjArray: [responseObj],
                xhr: xmlhttp,
                url: url,
            });

            xmlhttp.onreadystatechange = resolvePendingAsyncRequest;
        }
        
        xmlhttp.send(config.data);
        
        if (!config.async) {
            var respObj = handleResponse(xmlhttp, config);
            executeCallbacks(respObj);
            return respObj;
        }
        
        return responseObj;
    };


    api.get = function(url, config) {
        config.method = 'GET';
        config.url = url;
        return this.request(config);
    };

    api.post = function(url, data, config) {
        config.method = 'POST';
        config.url = url;
        if (typeof data !== 'string')
            config.data = JSON.stringify(data);
        else
            config.data = data;
        return this.request(config);
    };

    api.delete = function(url, config) {
        config.method = 'DELETE';
        config.url = url;
        return this.request(config);
    };

    api.put = function(url, data, config) {
        config.method = 'PUT';
        config.url = url;
        if (typeof data !== 'string')
            config.data = JSON.stringify(data);
        else
            config.data = data;
        return this.request(config);
    };


    //set the default configs for all requests, overrides existing if overlapping
    api.setDefaultHeader = function(header, value) {
        defaultHeaders[header] = value;
    };
    api.clearDefaultHeaders = function() {
        defaultHeaders = {};
    };
    api.getDefaultHeaders = function() {
        return defaultHeaders;
    };

    return api;
});



