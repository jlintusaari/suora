"use strict";

/* @kTekdoc service
 * @name BasicRESTFactory
 * @function
 * 
 * @param {string} url
 * @param {string} idPropertyName
 * @param {Object} cache
 * 
 * @description
 * 
 * The api functions return a response object that is filled with first cached data
 * and then will be filled with the response data when it arrives if the data is
 * dirty
 *      {
 *          data: contains the response data or cached
 *          success: did the request succeed or not
 *          status: the status code of the server / 'cached' / 'dirty'
 *          config: the used config object
 *      }
 *      
 *      The provided callback are given as parameters: data, status, config
 */

/* @kTekdoc object
 * @name BasicRESTObject
 * 
 * 
 */

s.registerService('BasicRESTFactory', function() {
    var Http = s.getService("Http"),
        cacheFactory = s.getService('$cacheFactory');
    
    var factoryApi = {};
    
    factoryApi.asetaDefaultHeader = function(header, value) {
        Http.setDefaultHeader(header, value);
    },
    
    factoryApi.luo = function(url, cache) {
        if (!url) throw new Error("BasicRESTFactory: url ei määritetty");
        
        var config = {
            url: url,
        };
        if (cache) {
            if (typeof cache === "string")
                cache = cacheFactory.get(cache) ? cacheFactory.get(cache) : cacheFactory(cache);
            config.cache = cache;
        }
            

        var RESTmodule = (function(config) {
            var api = {};
            var state = 1;
            
            //you can optionally pass an config object instead of errorFn
            function getConfigCopy(errorFn, successFn, params, async) {
                var configCopy = s.copyObject(config);
                if (typeof errorFn === "object") {
                    s.extend(configCopy, errorFn);
                }
                else {
                    if (params) configCopy.params = params;
                    configCopy.success = successFn;
                    configCopy.error = errorFn;
                    configCopy.async = async;
                }               
                
                return configCopy;
            }
            
            /*
             * For the following query functions
             * you can optionally pass an config object instead of errorFn
             */
            
            api.haeLista = function(errorFn, successFn, params, async) {
                var config = getConfigCopy(errorFn, successFn, params, async);
                return Http.get(config.url, config);
            };
            
            api.hae = function(resource, errorFn, successFn, params, async) {
                var config = getConfigCopy(errorFn, successFn, params, async);
                return Http.get(config.url+'/'+resource, config);
            };

            api.luo = function(objekti, errorFn, successFn, async) {
                var config = getConfigCopy(errorFn, successFn, null, async);
                state++;
                Http.post(config.url, objekti, config);
            };
            
            api.luoResurssi = function(resurssi, objekti, errorFn, successFn, params, async) {
                var config = getConfigCopy(errorFn, successFn, params, async);
                state++;
                Http.post(config.url+'/'+resurssi, objekti, config);
            }

            api.poista = function(id, errorFn, successFn, async) {
                var config = getConfigCopy(errorFn, successFn, null, async);
                state++;
                Http.delete(config.url + '/' + id, config);
            };

            api.paivita = function(id, muutosObjekti, errorFn, successFn, async) {
                var config = getConfigCopy(errorFn, successFn, null, async);
                state++;
                Http.put(config.url + '/' + id, muutosObjekti, config);
            };
            
            api.annaTila = function() {
                return state;
            };
            
            api.paivitaTila = function() {
                state++;
                return state;
            };
            
            api.annaConfigKopio = getConfigCopy;
            
            return api;
        })(config);

        return RESTmodule;
    };
    
    return factoryApi;
});