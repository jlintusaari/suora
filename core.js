/*
 * Needed services:
 * Routing
 * Routing service gets callbacks for created views that then control the change of templates
 * Template handling
 * http
 */

/* Needed partials:
 * views
 * 
 */

s = (function() {
//inner structure
    var controllerFactories = {},
            partialFactories = {},
            serviceFactories = {},
            filterFactories = {},
            controllers = {},
            partials = {},
            services = {},
            filters = {},
            configFns = []; //called before the dom is compiled

    var instanceCounter = 0,
            updateCycleCount = 0,
            updating = false,
            updateAgain = false;

    /*
     * Helper functions adopted from angular.js
     * 
     * 
     */

    function isUndefined(value) {
        return typeof value === 'undefined';
    }
    function isDefined(value) {
        return typeof value !== 'undefined';
    }
    function isObject(value) {
        return value != null && typeof value === 'object';
    }
    function isString(value) {
        return typeof value === 'string';
    }
    function isNumber(value) {
        return typeof value === 'number';
    }
    function isDate(value) {
        return toString.apply(value) === '[object Date]';
    }
    function isArray(value) {
        return toString.apply(value) === '[object Array]';
    }
    function isFunction(value) {
        return typeof value == 'function';
    }


    function forEach(obj, iterator, context) {
        var key;
        if (obj) {
            if (isFunction(obj)) {
                for (key in obj) {
                    if (key != 'prototype' && key != 'length' && key != 'name' && obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key);
                    }
                }
            } else if (obj.forEach && obj.forEach !== forEach) {
                obj.forEach(iterator, context);
            } else if (obj.length) {
                for (key = 0; key < obj.length; key++)
                    iterator.call(context, obj[key], key);
            } else {
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key);
                    }
                }
            }
        }
        return obj;
    }

    function sortedKeys(obj) {
        var keys = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys.sort();
    }

    function forEachSorted(obj, iterator, context) {
        var keys = sortedKeys(obj);
        for (var i = 0; i < keys.length; i++) {
            iterator.call(context, obj[keys[i]], keys[i]);
        }
        return keys;
    }
    /*
     * @description
     * Extends the destination object `dst` by shallow copying all of the properties from the `src` object(s)
     * to `dst`. You can specify multiple `src` objects.
     */
    function extend(dst) {
        forEach(arguments, function(src) {
            if (src !== dst) {
                forEach(src, function(value, key) {
                    dst[key] = value;
                });
            }
        });
        return dst;
    }
    
    function copyObjectShallow(src, dst) {
        dst = dst || {};
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                dst[key] = src[key];
            }
        }
        return dst;
    }
    
    function copyObject(src, dst) {
        dst = dst || {};
        for (var key in src) {
            if (src.hasOwnProperty(key)) {
                var prop = src[key];
                if (prop && typeof prop == "object") {
                    if (prop.length !== undefined)
                        prop = copyArray(prop);
                    else
                        prop = copyObject(prop);
                }
                dst[key] = prop;
            }
        }
        return dst;
    }

    function copyArray(src, dst) {
        dst = dst || [];
        dst.length = 0;
        for (var i = 0; i < src.length; i++) {
            var elem = src[i];
            if (typeof elem === "object") {
                if (elem.length !== undefined)
                    elem = copyArray(elem);
                else
                    elem = copyObject(elem);
            }
            dst.push(elem);
        }
        return dst;
    }



    /*
     * DOM manipulation functions
     */
    
    
    function fireEvent(ename, target, paramsObj) {
        var e = document.createEvent("Event", paramsObj);
        //true for can bubble, true for cancelable
        e.initEvent(ename, true, true);
        //for (var key in paramsObj)
        //    e[key] = paramsObj[key];
        target.dispatchEvent(e);
    }

    function matches(selector, elem) {
        var matches = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector || elem.oMatchesSelector;
        if (!matches)
            throw new Error("Core: no matchesSelector available in your browser");
        return matches.call(elem, selector);
    }

    /**
     * 
     * Finds the closest element matching the selector starting from self and
     * proceeding upwards in the tree
     */
    function closest(selector, startElem) {
        var elem = startElem;
        while (!matches(selector, elem)) {
            do {
                elem = elem.parentNode;
                if (elem.nodeName == '#document')
                    return null;
            } while (elem.nodeType != 1)
        }
        return elem;
    }

    function querySelectorAll(selector, elem) {
        elem = elem || document;
        return elem.querySelectorAll(selector);
    }


    function getPosition(element) {
        var xPosition = 0;
        var yPosition = 0;

        while(element) {
            xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
            yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
            element = element.offsetParent;
        }
        return { x: xPosition, y: yPosition };
    }

    /*
     * Suora framework core private functions
     * 
     */


    /* register functions */
    function registerController(name, factoryFn) {
        if (controllerFactories[name])
            throw new Error("Controller factory with a name " + name + " is already registered!");
        controllerFactories[name] = factoryFn;
    }

    //priority 1-100. Default is 50. Smaller number means higher priority.
    function registerPartial(name, factoryFn, priority) {
        if (partialFactories[name])
            throw new Error("Partial factory with a name " + name + " is already registered!");
        factoryFn.priority = priority ? priority : 50;
        partialFactories[name] = factoryFn;
    }

    function registerService(name, factoryFn) {
        if (serviceFactories[name])
            throw new Error("Service factory with a name " + name + " is already registered!");
        serviceFactories[name] = factoryFn;
    }

    function registerFilter(name, factoryFn) {
        if (filterFactories[name])
            throw new Error("Filter factory with a name " + name + " is already registered!");
        filterFactories[name] = factoryFn;
    }

    function registerConfigFn(fn) {
        configFns.push(fn);
    }

    /* has functions */
    function hasPartialFactory(name) {
        return partialFactories.hasOwnProperty(name);
    }
    
    function hasControllerInstance(id) {
        return !!controllers[id];
    }

    function getPartialPriority(name) {
        return partialFactories[name].priority;
    }

    /* getInstance functions */
    function getControllerInstance(id) {
        if (!controllers[id])
            throw new Error("Controller with an id " + id + " not found!");
        return controllers[id];
    }

    function getPartialInstance(id) {
        if (!partials[id]) {
            throw new Error("Partial with an id " + id + " not found!");
        }
        return partials[id];
    }
    
    function getPartialsFromElement(elem) {
        var arr = [];
        if (!elem.hasAttribute("data-s-pids"))
            return arr;
        var pids = elem.getAttribute("data-s-pids").split(',');
        for (var i = 0; i < pids.length; i++)
            arr.push(getPartialInstance(pids[i]));
        return arr;
    }

    function getService(name) {     //remember that services are singletons
        if (!services[name]) {
            var factory = serviceFactories[name];
            if (!factory) {
                throw new Error("No service named " + name + " registered!");
            }
            var service = factory();
            service._name = name;
            services[name] = service;
        }
        return services[name];
    }

    function getFilter(name) {
        if (filters[name] && arguments.length === 1)
            return filters[name];
        
        var factory = filterFactories[name];
        if (!factory)
            throw new Error("No filter named " + name + " registered!");
        var args = Array.prototype.slice.call(arguments, 1);
        var filter = factory.apply(null, args);
        filter._name = name;
        //cache it if normally constructed
        if (args.length === 0)
            filters[name] = filter;
        return filter;
    }

    /* create instance functions */
    function createControllerInstance(name) {
        var factory = controllerFactories[name];
        if (!factory) {
            throw new Error("No controller factory named " + name + " registered!");
        }

        var id = name + instanceCounter.toString();
        instanceCounter++;
        var instance = factory(id, name);
        if (!instance)
            throw new Error("Controller " + name + " did not return a scope!");
        instance._id = id;
        instance._name = name;
        controllers[id] = instance;
        return instance;
    }

    function createPartialInstance(name, elem, controller) {
        var factory = partialFactories[name];
        if (!factory) {
            throw new Error("No partial factory named " + name + " registered!");
        }

        var id = name + instanceCounter.toString();
        instanceCounter++;
        var instance = factory(elem, controller);
        if (instance) { //not all partials create instances
            instance._id = id;
            instance._name = name;
            instance._controllerlId = controller ? controller._id : "_root";
            partials[id] = instance;
        }
        return instance;
    }

    function destroyController(target) {
        var ctrl;
        if (!isObject(target)) {
            var ctrl = controllers[target];
            if (!ctrl) {
                throw new Error("Controller with an id " + target + " not found for destroying!");
            }
        }
        else
            ctrl = target;
        if (ctrl._destroy)
            ctrl._destroy();
        delete controllers[ctrl._id];
    }

    function destroyPartial(id) {
        var partial = partials[id];
        if (!partial) {
            throw new Error("Partial with an id " + id + " not found for destroying!");
        }
        if (partial._destroy)
            partial._destroy();
        delete partials[id];
    }



    /* Goes through all partial instances and calls their respective update
     * functions if they exist
     */
    function update() {
        if (updating) {
            updateAgain = true;
            return;
        }
        updateCycleCount++;
        updating = true;
        console.log("updating s-framework")
        for (var id in controllers) {
            if (!controllers.hasOwnProperty(id))
                continue;
            var ctrl = getControllerInstance(id);
            if (ctrl._update) {
                ctrl._update();
            }
        }

        for (var id in partials) {
            if (!partials.hasOwnProperty(id))
                continue;
            var partial = getPartialInstance(id);
            if (partial._update) {
                partial._update();
            }
        }
        updating = false;

        if (updateAgain) {
            if (updateCycleCount >= 10)
                throw new Error("s.update() called more than 10 times in one cycle")
            updateAgain = false;
            update();
        }
        else {
            console.log("updateCycleCount: ", updateCycleCount)
            updateCycleCount = 0;
        }
    }


    /* CORE services 
     *
     * compile traverses the DOM tree of an element looking for partials and 
     * controllers from the data attributes of the elements. If it finds
     * an partial it creates an instance of it using the factories
     * 
     */
    function compile(elem, controller) {
        //for caller to gain control of what was instantiated
        var createdControllerIds = [];
        var createdPartialIds = [];
        var dontCompileFlag = false;
        if (elem.nodeType === 1) {
            var dataset = elem.dataset;

            if (dataset.sController) {
                var name = dataset.sController;
                controller = createControllerInstance(name);
                dataset.sController = controller._id;
                createdControllerIds.push(controller._id);
            }

            var partialsToCreate = [];

            for (var attrname in dataset) {
                if (!dataset.hasOwnProperty(attrname))
                    continue;
                if (hasPartialFactory(attrname)) {
                    partialsToCreate.push(attrname);
                }
            }

            partialsToCreate.sort(function(a, b) {
                return(getPartialPriority(a) - getPartialPriority(b));
            });

            for (var i = 0; i < partialsToCreate.length; i++) {
                var partial = createPartialInstance(partialsToCreate[i], elem, controller);
                if (partial) {
                    createdPartialIds.push(partial._id);
                    if (partial._update || partial._exposeAPI)
                        dataset.sPids = 
                            dataset.sPids ? dataset.sPids+','+partial._id : partial._id;
                    if (partial._dontCompile || partial.dontCompile)
                        dontCompileFlag = true;
                }
            }

        }
        var child = dontCompileFlag ? null : elem.firstChild;
        while (child) {
            var resultObj = compile(child, controller);
            createdControllerIds = createdControllerIds.concat(resultObj.createdControllerIds);
            createdPartialIds = createdPartialIds.concat(resultObj.createdPartialIds);
            child = child.nextSibling;
        }

        return({
            //element: elem,
            createdControllerIds: createdControllerIds,
            createdPartialIds: createdPartialIds
        });
    }

    compile.children = function(elem, controller) {
        var children = elem.children;
        var createdControllerIds = [];
        var createdPartialIds = [];
        for (var i = 0; i < children.length; i++) {
            var resultObj = this(children[i], controller);
            createdControllerIds = createdControllerIds.concat(resultObj.createdControllerIds);
            createdPartialIds = createdPartialIds.concat(resultObj.createdPartialIds);
        }
        return({
            element: elem,
            createdControllerIds: createdControllerIds,
            createdPartialIds: createdPartialIds
        });
    };

    compile.decompile = function(compileObj) {
        if (!compileObj)
            return;
        var pids = compileObj.createdPartialIds;
        var cids = compileObj.createdControllerIds;

        for (var i = 0; i < pids.length; i++) {
            destroyPartial(pids[i]);
        }
        pids.length = 0;

        for (var i = 0; i < cids.length; i++) {
            destroyController(cids[i]);
        }
        cids.length = 0;
        compileObj.element = null;
    }

    compile._name = "Compile";
    services.Compile = compile;

    /* Controllers service
     * 
     */

    services.Controllers = {
        _name: "Controllers",
        get: getControllerInstance,
        create: createControllerInstance,
        has: hasControllerInstance,
        destroy: destroyController
    };

    getFilter._name = "Filters";
    services.Filters = getFilter;

    /* 
     * Instantiation
     */


    window.onload = function() {
        for (var i = 0; i < configFns.length; i++)
            configFns[i]();
        delete configFns;

        var htmlElem = document.documentElement;
        var resultObj = compile(htmlElem);
    };
    
    //construct the s object
    
    var self = function(selector, elem) {
        elem = elem || document;
        return elem.querySelector(selector);
    }
    

    self.registerController = registerController;
    self.registerPartial = registerPartial;
    self.registerService = registerService;
    self.registerFilter = registerFilter;
    self.registerConfigFn = registerConfigFn;
    self.getService = getService;
    self.getPartial = getPartialInstance;
    self.getPartialsFromElement = getPartialsFromElement;
    self.getFilter = getFilter;
    self.update = update;
    //helpers
    self.copyObject = copyObject;
    self.copyObjectShallow = copyObjectShallow;
    self.copyArray = copyArray;
    self.extend = extend;
    self.isString = isString;
    self.isDate = isDate;
    self.forEach = forEach;
    //DOM manipulation
    self.fireEvent = fireEvent;
    self.matches = matches;
    self.closest = closest;
    self.all = querySelectorAll;
    self.getPosition = getPosition;
    //debug only
    self.controllers = controllers;
    self.partials = partials;
    self.services = services;

    return self;
})();
