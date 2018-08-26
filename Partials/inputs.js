"use strict";

/**
 * Binds DOM element preperties to specific controller properties. If the 
 * controller property is an object, we use the element's name to specify
 * the proper object property.
 * 
 * Works only with input element and their values
 */

(function() {
    var bindProps = ['value'];

    for (var i in bindProps) {
        var registerName = "bind" + bindProps[i][0].toUpperCase() + bindProps[i].slice(1);
        var partialFn = partialFactory(bindProps[i]);
        s.registerPartial(registerName, partialFn);
    }
    
    s.registerPartial("bindInner", partialFactory('innerHTML', 'inner'));

    s.registerPartial("saveInput", function(elem, controller) {
        var partialname = "data-save-input";
        var Eval = s.getService("Eval");
        var V = s.getService("Validator")
        elem.addEventListener('input', save, false);

        function save() {
            var target = elem.getAttribute(partialname);
            if (V.validateInput(elem)) {
                var val = V.getElementValue(elem);
                Eval.setProperty(target, val, controller);
                s.update();
            }
        }

        function destroy() {
            elem.removeEventListener("input", save, false);
        }

        return {
            _destroy: destroy
        }
    })

    s.registerPartial("syncInput", function(elem, controller) {
        var partialname = "data-sync-input";
        var Eval = s.getService("Eval");
        var V = s.getService("Validator");
        elem.addEventListener('input', save, false);

        updateElemProperty();

        function updateElemProperty() {
            var target = elem.getAttribute(partialname);
            if (!target)
                throw new Error(partialname + ": no controller variable or function given");
            var value = Eval.exec(target, controller, elem);
            /*if (typeof value == 'object') {
                var propertyName = elem.getAttribute("name");
                if (!propertyName)
                    throw new Error(partialname + ": no name attribute specified " + elem);
                value = Eval.exec(propertyName, value, elem);
            }*/
            if (typeof value !== 'undefined' && V.getElementValue(elem) !== value) {
                elem.value = value;
            }
        }

        function save() {
            if (V.validateInput(elem)) {
                var target = elem.getAttribute(partialname);
                var val = V.getElementValue(elem);
                Eval.setProperty(target, val, controller);
                s.update();
            }
        }

        function destroy() {
            elem.removeEventListener("input", save, false);
        }

        return {
            _destroy: destroy,
            _update: updateElemProperty
        };
    })


    function partialFactory(propname, bindattr) {
        var partialname = "data-bind-" + (bindattr || propname);
        
        return function(elem, controller) {
            var Eval = s.getService("Eval");
            updateElemProperty();

            function updateElemProperty() {
                var target = elem.getAttribute(partialname);
                if (!target)
                    throw new Error(partialname + ": no controller variable or function given");
                var value = Eval.exec(target, controller, elem);
                /*if (typeof value == 'object') {
                    var propertyName = elem.getAttribute("name");
                    if (!propertyName)
                        throw new Error(partialname + ": no name attribute specified " + elem);
                    value = Eval.exec(propertyName, value, elem);
                }*/
                if (value === undefined)
                    value = "";
                
                elem[propname] = value;
                
            }

            

            return {
                _update: updateElemProperty
            };
        }
    }

})();