/** Ready made services of the Suora framework 
 * 
 * @suoradoc core
 * @name Services
 * @description
 *
 * Services are services used by controllers and partials. They are the means
 * by which controllers and partials can share data or communicate with each other,
 * gain data from the backend and so forth.
 * 
 * Services are singletons, which means that only one instance of a service will
 * ever be instantiated. Services are not meant for manipulating the DOM, that is
 * the responsibility of the partials.
 * 
 * ServiceFactories return an object that provides an api for the use of the 
 * service. That object is augmented with a _name attribute that the framework 
 * uses to identify the singleton instance.
 * 
 */




"use strict"

s.registerService("Eval", function() {
    var P = s.getService("Parser");
    var V = s.getService("Validator");

    function getProperty(propStr, context) {
        if (!P.isPropertyForm(propStr))
            throw new Error("Eval.getProperty: invalid argument property string: " + propStr)
        var parts = propStr.split('.');
        if (parts[0] === 's') {
            context = s;
            parts.splice(0, 1);
        }
        if (parts[0] === "this")
            parts.splice(0, 1); 
        var target = context;
        for (var i = 0; i < parts.length; i++) {
            target = target[parts[i]];
        }
        return target;
    }

    function setProperty(propStr, value, context) {
        if (!P.isPropertyForm(propStr))
            throw new Error("Eval.setProperty: invalid argument property string: " + propStr)
        var parts = propStr.split('.');
        if (parts[0] === "this")
            parts.splice(0, 1);
        var target = context;
        for (var i = 0; i < parts.length-1; i++) {
            target = target[parts[i]];
        }
        target[parts[i]] = value;
    }

//naive implementation, just evaluates expressions by order. 
// true || false && true = true
//Accepts only && and ||
    function isTrue(expr, context, argContext) {
        var res = true, curExpr, lastIndex=0, isNextAndOpr = true;
        var delimRe = /([^\|]*)\s?\|\|\s?|([^&]*)\s?&&\s?/g;
        
        while (advance_in_chain()) {
            
            if (isNextAndOpr && !res)
                return false;
            else if (!isNextAndOpr && res)
                return true;

            lastIndex = delimRe.lastIndex;
        }
            
        expr = expr.substr(lastIndex);
        expr = P.killWhiteSpaceFromEnds(expr);
        
        if (isNextAndOpr)
            res = res && is_true_eval(expr);
        else
            res = is_true_eval(expr);
        
        function advance_in_chain() {
            var reRes = delimRe.exec(expr);
            if (!reRes)
                return false;
            curExpr = reRes[1] || reRes[2];
            curExpr = P.killWhiteSpaceFromEnds(curExpr);
            res = is_true_eval(curExpr);
            isNextAndOpr = !!reRes[2];
            return true;
        }
        
        function is_true_eval(expr) {
            return (expr[0] == '!') ? !exec(expr.slice(1), context, argContext) : !!exec(expr, context, argContext);
        }
        
        return res;
    }

    /**
     * argContext can be a NamedNodeMap or an DOM element. If it's an element
     * and cannot find the property it falls back to the attributes hash of the
     * element.
     * 
     * exec at this moment only calls functions with specified arguments or
     * returns the asked variable value. It doesn't do assignments.
     * 
     * expr=funktioNimi(argumentti);
     * expr=funktioNimi((css-selector)->propertyName);      //bypasses argContext
     * expr=haettavaMuuttuja
     */
    
    function exec(expr, context, argContext) {
        try {
            var res = expression(expr, context, argContext);
        }
        catch (e) {
            if (e instanceof EvalError) {
                console.log(e.message);
                return;
            }
            throw e;
        }
        if (typeof res === "function")
            res = res.call(context);
        return res;
    }
    
    function expression(expr, context, argContext, strict) {
        strict = strict || false;
        if (!argContext) //argContext is only used for the context for function arguments
            argContext = context;
        
        //resolve context if CSS selectors are used
        if (P.isContextForm(expr)) {
            context = document.querySelector(P.getContext(expr));         
            expr = P.getContextExpression(expr);
            expr = expr || "this";
        }
        
        var exprVal;
        if (expr === "")
            exprVal = "";
        else if (expr === undefined)
            exprVal = undefined;
        else if (expr[0] === "'")
            exprVal = expr.replace(/'/g, "");
        else if (P.isInteger(expr))
            exprVal = +parseInt(expr, 10);
        else if (P.isFloat(expr))
            exprVal = +parseFloat(expr);
        else {
            if (P.isFnForm(expr)) {
                var fnName = P.getFnName(expr);
                var fn = getProperty(fnName, context);
                //resolve the argument values
                var argVals = parseArguments(expr, argContext);
                exprVal = fn.apply(context, argVals);
            }
            else if (P.isPropertyForm(expr)) {
                exprVal = getProperty(expr, context);
                //fallback to DOM attributes if we didn't find a property value
                if (typeof exprVal === 'undefined' && context.attributes)
                    exprVal = getProperty(expr, context.attributes);
            }

            else {
                throw new EvalError("Eval-service: invalid expression " + expr);
            }
        }
        
        //determine a special action if the exprVal is a DOM node
        if (!strict && exprVal && typeof exprVal === 'object' && exprVal.nodeType) {
            //a form
            if (exprVal.nodeType == 1 && exprVal.nodeName === "FORM") {
                exprVal = V.serializeForm(exprVal);
                if (exprVal === null)
                    throw new EvalError("Eval-service: form was not valid")
            }
            else if (exprVal.nodeType == 1 && (exprVal.nodeName === "INPUT" || exprVal.nodeName === "TEXTAREA")) {
                exprVal = V.getValidatedValue(exprVal);
                if (exprVal === null)
                    throw new EvalError("Eval-service: input was not valid")
            }
            else if (exprVal.value || exprVal.nodeValue)
                exprVal = exprVal.value || exprVal.nodeValue;
        }
                
        return exprVal;
    }

    /*
     *Todo: This is potentially dangerous, as there may be
     *commas in the middle of strings or css-selectors
     *@param str can be csv of arguments or function expression
     */
    function parseArguments(str, argContext, strict) {
        strict = strict || false;
        var fnArgs = (P.isFnForm(str)) ? P.getFnArg(str) : str
        var argVals = [];
        var parts = fnArgs.split(',');
        for (var pi = 0; pi < parts.length; pi++) {
            var fnArgExpr = parts[pi];
            argVals[pi] = expression(fnArgExpr, argContext, undefined, strict);
        }
        return argVals;
    }

    return {
        exec: exec,
        isTrue: isTrue,
        getExpressionProperty: expression,
        getProperty: getProperty,
        setProperty: setProperty,
        parseArguments: parseArguments
    }
})

s.registerService("Parser", function() {
    var contextRe = /^\(([^\)]+)\)\->(.+)/; //deprecated
    var selectorRe = /^<\(([^\)]+)\)>(.*)?/;
    var fnRe = /^([^\(\s\-]+)\((.*)\);?$/;
    var propRe = /^[^0-9\W][\w\-\.]*$/;
    var propNameRe = /^[^0-9\W][\w\-\.]*/;
    var numberRe = /-\[0-9]+/;
    var intRe = /^\-?[0-9]$|^\-?[1-9][0-9]*$/;
    var floatRe = /^\-?[1-9][0-9]*\.[0-9]+$|^\-?0?\.[0-9]+$/;
    var parsers = {
        isInteger: function(str) {
            return intRe.test(str);
        },
        isFloat: function(str) {
            if (parsers.isInteger(str))
                return true;
            return floatRe.test(str);
        },
        isNumber: function(str) {
            return numberRe.test(str);
        },
        isPropertyForm: function(str) {
            return propRe.test(str);
        },
        isFnForm: function(str) {
            return fnRe.test(str);
        },
        isContextForm: function(str) {
            return contextRe.test(str) || selectorRe.test(str);
        },
        isSelectorForm: function(str) {
            return selectorRe.test(str);
        },
        getPropName: function(str) {
            var n = propNameRe.exec(str);
            return n === null ? null : n[0];
        },
        getFnName: function(str) {
            if (this.isFnForm(str))
                return fnRe.exec(str)[1];
            else
                throw new Error("Parser.fnName: invalid argument (not in fnForm) " + str)
        },
        getFnArg: function(str) {
            if (this.isFnForm(str))
                return fnRe.exec(str)[2];
            else
                throw new Error("Parser.fnArg: invalid argument (not in fnForm) " + str)
        },
        getContext: function(str) {
            if (this.isSelectorForm(str))
                return selectorRe.exec(str)[1];
            if (this.isContextForm(str))
                return contextRe.exec(str)[1];
            else
                throw new Error("Parser.getContext: invalid argument" + str)
        },
        getContextExpression: function(str) {
            if (this.isSelectorForm(str))
                return selectorRe.exec(str)[2];
            if (this.isContextForm(str))
                return contextRe.exec(str)[2];
            else
                throw new Error("Parser.getContextExpression: invalid argument " + str)
        },
        killWhiteSpace: function(str) {
            return str.replace(/\s+/g, '');
        },
        killWhiteSpaceFromEnds: function(str) {
            str = str.replace(/^\s*/, "");
            str = str.replace(/\s$/, "");
            return str;
        }
    };
    return parsers;
});
/*
 * 
 * 
 */

s.registerService("Validator", function() {
//construct validation error message element
    var Parser = s.getService("Parser");
    var errorelem = document.createElement("DIV");
    errorelem.className = "v-error";
    errorelem.style.zIndex = 100000;
    errorelem.onclick = removeVError;
    var errortext = document.createElement("SPAN");
    errortext.className = "text-error";
    errorelem.appendChild(errortext);
    function removeVError(e) {
        errorelem.parentNode.removeChild(errorelem);
        removeVErrorEventListeners(e.currentTarget);
    }

    function removeVErrorEventListeners(input) {
//input.removeEventListener("focus", removeVError, false);
        input.removeEventListener("input", removeVError, false);
        input.removeEventListener("blur", removeVError, false);
    }

    function setVError(input, msg) {
        errortext.innerHTML = msg;
        errorelem.style.left = -input.offsetWidth + "px";
        var top = input.offsetHeight ? input.offsetHeight : 26;
        errorelem.style.top = top + "px";
        input.parentNode.insertBefore(errorelem, input.nextSibling);
        //input.addEventListener("focus", removeVError, false);
        removeVErrorEventListeners(input); //in case they are hitting the button continuously
        input.addEventListener("input", removeVError, false);
        input.addEventListener("blur", removeVError, false);
        input.focus();
    }

    function transformValue(elem, value) {
        if (value === "")
            return value;
        if (elem.hasAttribute("data-type-integer") || elem.hasAttribute("data-integer") || elem.hasAttribute("data-type-int"))
            value = parseInt(value);
        else if (elem.hasAttribute("data-type-float"))
            value = parseFloat(value.replace(',', '.'));
        return value;
    }

    return {
        validateInt: function(numberstr) {
            var INT_RE = /^\-?[0-9]$|^\-?[1-9][0-9]*$/;
            if (!INT_RE.test(numberstr))
                return false;
            return !isNaN(parseInt(numberstr, 10));
        },
        validateSmartFloat: function(floatstr) {
            floatstr = floatstr.replace(',', '.');
            return Parser.isFloat(floatstr);
        },
        validateInput: function(input) {
            var value = input.value;
            if (!input.hasAttribute("required") && value === "")
                return true;
            if (input.hasAttribute("required") && value === "")
                setVError(input, "Tämä kenttä on täytettävä");
            else if ((input.hasAttribute("data-type-integer") || input.hasAttribute("data-integer")) && !this.validateInt(value))
                setVError(input, "Kentän arvon on oltava kokonaisluku");
            else if (input.hasAttribute("data-type-float") && !this.validateSmartFloat(value))
                setVError(input, "Kentän arvon on oltava luku");
            else
                return true;
            return false;
        },
        getInputValue: function(input) {
            if (input.getAttribute("type") == 'checkbox')
                return input.checked ? 1 : 0;
            if (input.selectedOptions) //select tag
                input = input.selectedOptions[0];
            var value = input.value;
            return transformValue(input, value);
        },
        getValidatedValue: function(input) {
            if (this.validateInput(input) === false)
                return null;
            return this.getInputValue(input);
        },
        getElementValue: function(elem) {
            return this.getInputValue(elem);
        },
        getElementProperty: function(elem, prop) {
            return transformValue(elem, elem[prop]);
        },
        validateForm: function(form) {
            var inputs = form.elements;
            var isFormValid = true;
            for (var i = 0; i < inputs.length; i++) {
                if (!this.validateInput(inputs[i])) {
                    isFormValid = false;
                    break;
                }
            }
            return isFormValid;
        },
        serializeForm: function(form) {
            if (!this.validateForm(form))
                return null;
            var obj = {};
            //var inputs = form.querySelectorAll("input,textarea");
            var inputs = form.elements; //finds also the associated inputs
            
            for (var i = 0; i < inputs.length; i++) {
                var input = inputs[i];
                if (!input.name)
                    continue;
                if (input.getAttribute("type") == "radio" && !input.checked)
                    continue;
                obj[input.name] = this.getInputValue(input);
                if (input.hasAttribute("data-reset"))
                    this.resetFormElement(input);
            }

            if (form.hasAttribute("data-reset"))
                this.resetForm(form);
            return obj;
        },
        resetForm: function(form) {
            var controls = form.elements;
            for (var i = 0; i < controls.length; i++)
                this.resetFormElement(controls[i]);
        },
        resetFormElement: function(felem) {
            if (felem.hasAttribute("value") || felem.value)
                felem.value = felem.getAttribute("value");
            if (felem.hasAttribute("autofocus"))
                felem.focus();
            if (felem.getAttribute("type") == "radio" && felem.hasAttribute("checked"))
                felem.checked = true;
            if (felem.nodeName === "SELECT") {
                var children = felem.children;
                for (var i=0; i<children.length; i++) {
                    var c = children[i];
                    if (i===0 || c.hasAttribute("selected"))
                        c.selected = true;
                }
            }
        }
    }
})


/*
 * @suoradoc service
 * @name sTemplateCache
 * @requires 
 * @description
 * The service used by the Suora framework to cache templates that partials use.
 * Templates can be stored directly as a string or retrieved from a url 
 * if not already retrieved.
 */

s.registerService("TemplateCache", function() {

    var cache = {};
    var api = {};
    api.get = function(url) {
        if (cache.hasOwnProperty(url)) {
            return cache[url];
        }

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url, false);
        xmlhttp.send();
        cache[url] = xmlhttp.responseText;
        return cache[url];
    }

    return api;
});
/*
 * @suoradoc service
 * @name sRouter
 * @description
 * Allows setting callbacks for route change events. Allows manipulating the route
 * from javascript using the service.
 */

s.registerService("Router", function() {
    var api = {};
    var routes = {};
    var lastRouteObj;
    var routeCallbacks = [];
    var calling = false;
    
    //add event listener for all link events
    document.addEventListener("click", handleLinkClick); 
    
    /*
     * routeObj can be anything. It's just passed to the registered callbacks
     */
    api.setRoute = function(url, routeObj) {
        routes[url] = routeObj;
        return this;
    };
    api.setDefaultRoute = function(routeObj) {
        this.setRoute("_default", routeObj);
        return this;
    };
    api.route = function(url, dontPush) {
        console.log("route: " + url);
        var RErouteparams = /:([^\/]*)/g;
        var routeFound = false;
        for (var routeurl in routes) {
            if (!routes.hasOwnProperty(routeurl))
                continue;
            var REroutematch = new RegExp("^" + routeurl.replace(RErouteparams, "([^\/]*)") + "$");
            if (!REroutematch.test(url))
                continue;
            var paramvalues = REroutematch.exec(url);
            //console.log(paramvalues)
            var routeparams = {};
            //collect routeurl variable names
            do {
                var paramname = RErouteparams.exec(routeurl);
                if (paramname) {
                    var value = paramvalues.splice(1, 1)[0];
                    var REint = /^[0-9]+$/;
                    if (REint.test(value))
                        value = parseInt(value);
                    routeparams[paramname[1]] = value;
                }
            } while (paramname);
            executeRouting(url, routeurl, routeparams);
            if (!dontPush)
                window.history.pushState(url, "", "");
            routeFound = true;
            break;
        }

        if (!routeFound && routes.hasOwnProperty("_default")) {
            if (!dontPush)
                window.history.pushState(url, "", "");
            s.getService("Log").notify("Requested page was not found");
            executeRouting(url, '_default', {});
        }
    };
    //view can register it's callback
    api.setCallback = function(callback) {
        routeCallbacks.push(callback);
        if (lastRouteObj)
            callback(lastRouteObj);
    }
    
    api.removeCallback = function(callback) {
        setTimeout(function() {
            var i = routeCallbacks.indexOf(callback);
            if (i > -1) {
                routeCallbacks.splice(i,1);
            }
        }, 0);
    }

    api.getRouteParams = function() {
        return lastRouteObj.params;
    }
    
    api.getCurrentRoute = function() {
        return lastRouteObj.url;
    }

    function executeRouting(url, routeurl, routeparams) {
        var routeobj = routes[routeurl];
        routeobj.params = routeparams;
        routeobj.url = url;
        lastRouteObj = routeobj;
        if (!calling) {
            calling = true;
            window.setTimeout(callCallbacks, 0);
        }
    }
    
    function callCallbacks() {
        calling = false;
        for (var i = 0; i < routeCallbacks.length; i++) {
            routeCallbacks[i](lastRouteObj);
        }
    }
    
    function handleLinkClick(event) {
            var telem = event.target;

            var routeurl = "";
            if (telem.hasAttribute("href")) {
                routeurl = telem.getAttribute("href");    
            }
            else if (telem.parentNode && telem.parentNode.hasAttribute("href")) {
                routeurl = telem.parentNode.getAttribute("href");    
            }
            if (telem.hasAttribute("data-fakelink") || telem.hasAttribute("data-r-fakelink")) {
                event.preventDefault();
                return;
            }
            if (telem.hasAttribute("data-r-back")) {
                event.preventDefault();
                setTimeout(function() {
                    window.history.back();
                }, 0);
            }
            
            if (routeurl) {
                event.preventDefault();
                setTimeout(function() {
                    api.route(routeurl);    
                }, 0);
            }
    }
    
    function destroyLinkListener() {
        document.removeEventListener("click", handleLinkClick);
    }

    window.onpopstate = function(e) {
        if (e.state) {
            console.log("redirecting to " + e.state)
            api.route(e.state, true);
        }
    };
    return api;
});
/**
 * @ngdoc object
 * @name ng.$cacheFactory
 *
 * @description
 * Factory that constructs cache objects.
 *
 *
 * @param {string} cacheId Name or id of the newly created cache.
 * @param {object=} options Options object that specifies the cache behavior. Properties:
 *
 *   - `{number=}` `capacity` — turns the cache into LRU cache.
 *
 * @returns {object} Newly created cache object with the following set of methods:
 *
 * - `{object}` `info()` — Returns id, size, and options of cache.
 * - `{void}` `put({string} key, {*} value)` — Puts a new key-value pair into the cache.
 * - `{{*}}` `get({string} key)` — Returns cached value for `key` or undefined for cache miss.
 * - `{void}` `remove({string} key)` — Removes a key-value pair from the cache.
 * - `{void}` `removeAll()` — Removes all cached values.
 * - `{void}` `destroy()` — Removes references to this cache from $cacheFactory.
 *
 */

s.registerService("$cacheFactory", function() {

    var $get = function() {
        var caches = {};
        function cacheFactory(cacheId, options) {
            if (cacheId in caches) {
                throw Error('cacheId ' + cacheId + ' taken');
            }

            var size = 0,
                    stats = s.extend({}, options, {id: cacheId}),
            data = {},
                    capacity = (options && options.capacity) || Number.MAX_VALUE,
                    lruHash = {},
                    freshEnd = null,
                    staleEnd = null;
            return caches[cacheId] = {
                put: function(key, value) {
                    var lruEntry = lruHash[key] || (lruHash[key] = {key: key});
                    refresh(lruEntry);
                    if (typeof value == 'undefined')
                        return;
                    if (!(key in data))
                        size++;
                    data[key] = value;
                    if (size > capacity) {
                        this.remove(staleEnd.key);
                    }
                },
                get: function(key) {
                    var lruEntry = lruHash[key];
                    if (!lruEntry)
                        return;
                    refresh(lruEntry);
                    return data[key];
                },
                remove: function(key) {
                    var lruEntry = lruHash[key];
                    if (!lruEntry)
                        return;
                    if (lruEntry == freshEnd)
                        freshEnd = lruEntry.p;
                    if (lruEntry == staleEnd)
                        staleEnd = lruEntry.n;
                    link(lruEntry.n, lruEntry.p);
                    delete lruHash[key];
                    delete data[key];
                    size--;
                },
                removeAll: function() {
                    data = {};
                    size = 0;
                    lruHash = {};
                    freshEnd = staleEnd = null;
                },
                destroy: function() {
                    data = null;
                    stats = null;
                    lruHash = null;
                    delete caches[cacheId];
                },
                info: function() {
                    return s.extend({}, stats, {size: size});
                }
            };
            /**
             * makes the `entry` the freshEnd of the LRU linked list
             */
            function refresh(entry) {
                if (entry != freshEnd) {
                    if (!staleEnd) {
                        staleEnd = entry;
                    } else if (staleEnd == entry) {
                        staleEnd = entry.n;
                    }

                    link(entry.n, entry.p);
                    link(entry, freshEnd);
                    freshEnd = entry;
                    freshEnd.n = null;
                }
            }


            /**
             * bidirectionally links two entries of the LRU linked list
             */
            function link(nextEntry, prevEntry) {
                if (nextEntry != prevEntry) {
                    if (nextEntry)
                        nextEntry.p = prevEntry; //p stands for previous, 'prev' didn't minify
                    if (prevEntry)
                        prevEntry.n = nextEntry; //n stands for next, 'next' didn't minify
                }
            }
        }


        cacheFactory.info = function() {
            var info = {};
            forEach(caches, function(cache, cacheId) {
                info[cacheId] = cache.info();
            });
            return info;
        };
        cacheFactory.get = function(cacheId) {
            return caches[cacheId];
        };
        return cacheFactory;
    };
    return $get();
});
s.registerService("Log", function() {

    var alert = document.createElement("DIV");
    var text = document.createTextNode("");
    var closeBtn = document.createElement("BUTTON");
    closeBtn.type = "button";
    closeBtn.className = "close";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = hide;
    alert.appendChild(text);
    alert.appendChild(closeBtn);
    alert.style.position = "fixed";
    alert.style.bottom = "30px";
    alert.style.left = "30px";
    alert.style.zIndex = 1000000;
    alert.className = "alert alert-info";
    hide();
    document.body.appendChild(alert);
    
    var last_id = null;
    
    function hide() {
        last_id = null;
        alert.style.display = "none";
    }

    function show(message, type, seconds) {
        text.nodeValue = message;
        seconds = seconds || 10;
        alert.style.display = "block";
        var classname;
        switch (type) {
            case "notify":
                classname = "alert alert-info";
                break;
            case "success":
                classname = "alert alert-success";
                break;
            case "error":
                classname = "alert alert-error";
                break;
            case "warn":
                classname = "alert";
                break;
        }
        alert.className = classname;
        if (last_id !== null) {
            window.clearTimeout(last_id);
            last_id = null;
        }
        if (type !== "error")
            last_id = window.setTimeout(hide, seconds * 1000);
    }

    var api = {
        reportError: function(msg) {
            if (msg && msg.error)
                msg = msg.error;
            show(msg, "error");
        },
        reportSuccess: function(msg) {
            show(msg, "success");
        },
        notify: function(msg) {
            show(msg, "notify");
        },
        warn: function(msg) {
            show(msg, "warn");
        },
    }



    return api;
});