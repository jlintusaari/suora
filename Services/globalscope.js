"use strict";
/* 
 * Global object scope. Supports namespaces as a second argument
 * 
 * For controllers to share information in a disciplined manner.
 * 
 */

s.registerService("Globalscope", function() {
    var _namespaces = {},
        _defaultNamespace = "global";
    
    return {
        set: function(prop, val, namespace) {
            if (typeof namespace === "undefined")
                namespace = _defaultNamespace;
            if (!_namespaces.hasOwnProperty(namespace))
                _namespaces[namespace] = {};
            _namespaces[namespace][prop] = val;
        },
        get: function(prop, namespace) {
            if (typeof namespace === "undefined")
                namespace = _defaultNamespace;
            if (!_namespaces.hasOwnProperty(namespace))
                return undefined;
            return _namespaces[namespace][prop];
        },
        pluck: function(prop, namespace) {
            var val = this.get(prop,namespace);
            this.delete(prop, namespace);
            return val;
        },
        delete: function(prop, namespace) {
            if (typeof namespace === "undefined")
                namespace = _defaultNamespace;
            if (!_namespaces.hasOwnProperty(namespace))
                return;
            delete _namespaces[namespace][prop];
        },
        getNamespace: function(name) {
            if (typeof name === "undefined")
                name = _defaultNamespace;
            if (!_namespaces.hasOwnProperty(name))
                _namespaces[name] = {};
            return _namespaces[name];
        },
        setNamespace: function(namespacename, obj) {
            if (!namespacename)
                throw new Error("Globalscope.setNamespace: please provide namespace name");
            _namespaces[namespacename] = {};
        },
        deleteNamespace: function(name) {
            if (!name)
                throw new Error("Globalscope.deleteNamespace: please provide namespace name");
            delete _namespaces[name];
        }
    }
})
