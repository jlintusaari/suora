"use strict";

(function() {
    var prefix = "_m";
    var Filters = s.getService("Filters"),
        Eval = s.getService("Eval"),
        Parser = s.getService("Parser");

    /** 
     * data-mustache-repeat="controllerGetFn"
     * Repeats over the list provided by the the controllerGetFn. The getFn is
     * expected to take a callback as a parameter and call that with data as the
     * first argument.
     * 
     * All mustache functionality is available. Controller is used as the model.
     * Note that since this is repeat, the repeating over the list is done 
     * automatically, you only need to provide the template.
     * 
     * We have extended the functionality of mustache.js with {{varName|filter_str}}
     * 
     * @Partial
     * @Name mustacheRepeat
     */

    s.registerPartial("mRepeat", function(elem, controller) {
        var name = "data-m-repeat";
        var templateHTML = elem.innerHTML;
        var templateHTML = "{{#" + prefix + "._listdata}}" + templateHTML + "{{/" + prefix + "._listdata}}";
        elem.innerHTML = "";
        var rendering = false;

        //prepare the filters
        var filtered = {};
        templateHTML = prepare(templateHTML, filtered, controller);

        var attr_val = elem.getAttribute(name);
        if (!attr_val)
            throw new Error(name + ": no attribute value given")
        
        var linkFn = Mustache.compile(templateHTML);
 
        update();

        function render(data) {
            if (rendering)
                throw new Error(name + ": call to render while rendering: " + attr_val)
            rendering = true;
           
            //var t = new Date();
            if (data.length === undefined) { //convert to array
                var lista = [];
                s.forEach(data, function(val, key) {
                    lista.push(val);
                })
                data = lista;
            }
            
            if (controller[prefix])
                throw new Error(name + ": your controller " + controller._name + " must not have property " + prefix)
            controller[prefix] = filtered;
            controller[prefix]["_listdata"] = data;

            if (controller._row)
                throw new Error(name + ": your controller " + controller._name + " must not have property " + "_row")
            
            var row = 0;
            controller._row = getRowIndex;

            elem.innerHTML = linkFn(controller);

            delete controller[prefix];
            delete controller._row;
            //console.log((new Date - t)/1000 + " sec");
            rendering = false;
           
            function getRowIndex() {
                row++;
                return row;
            }
        }

        function update() {
            get_attribute_data(attr_val, elem, controller, render)
        }

        return({
            _update: update,
            _dontCompile: true
        })
    }, 1);

    s.registerPartial('mRender', mFactory('data-m-render'), 1);
    s.registerPartial('mCompile', mFactory('data-m-compile'), 1);
    s.registerPartial('mBind', mFactory('data-m-bind'), 1);
    s.registerPartial('mPartial', mFactory('data-m-partial'), 1);

    function mFactory(AttrName) {

        var product = function(elem, controller) {
            var Compile = s.getService("Compile");
            var name = AttrName;
            var compileObj;
            var renderFn;
            var rendering = false;

            var filtered = {};
            var templateHTML = prepare(elem.innerHTML, filtered, controller);
            elem.innerHTML = "";

            var attr_str = elem.getAttribute(name);
            var propname = Parser.getPropName(attr_str);
            
            var retObj = {};

            switch (name) {
                case 'data-m-render':
                    retObj = undefined;
                    renderFn = renderOnly;
                    break;
                case 'data-m-compile':
                    retObj._destroy = destroy;
                    retObj._dontCompile = true;
                    renderFn = renderAndCompile;
                    break;
                case 'data-m-bind':
                    retObj._update = update;
                    retObj._dontCompile = true;
                    renderFn = renderOnly;
                    break;
                case 'data-m-partial':
                    retObj._destroy = destroy;
                    retObj._update = update;
                    retObj._dontCompile = true;
                    renderFn = renderAndCompile;
                    break;
            }
            
            update();
            
            function update() {
                get_attribute_data(attr_str, elem, controller, renderFn)
            }

            function renderOnly(data) {
                if (rendering)
                    throw new Error(name + ": call to render while already rendering: " + attr_str);
                rendering = true;
                //var t = new Date();
                if (controller[prefix])
                    throw new Error(name + ": your controller " + controller._name + " must not have property " + prefix)
                var scope = s.copyObjectShallow(controller);
                if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]')
                    s.extend(scope, data);
                scope[propname] = data;
                scope[prefix] = filtered;
                elem.innerHTML = Mustache.render(templateHTML, scope);
                //console.log((new Date - t)/1000 + " sec");
                rendering = false;
            }

            function renderAndCompile(data) {
                Compile.decompile(compileObj);
                renderOnly(data);
                compileObj = Compile.children(elem, controller);
            }

            function destroy() {
                Compile.decompile(compileObj);
            }
            
            return retObj;
        };
        return product;
    }
    
    /*
     * gets and filtered the data as specified in the attribute value passing it to callback
     * Return the attribute bare name
     */
    function get_attribute_data(attr_str, elem, controller, callback) {
        if (!attr_str) {
            callback();
            return;
        }
        
        var actual_callback = callback;   
        var parts = attr_str.split('|');
        var propstr = parts.splice(0,1)[0];
        
        if (parts.length>0) {
            var filter = filter_factory(parts, elem);
            actual_callback = filterFn;
        }
        
        if (Parser.isFnForm(propstr)) {
            var dataprop = Eval.getExpressionProperty(Parser.getFnName(propstr), controller);
            var dataprop_args = Eval.parseArguments(propstr, elem);
            dataprop_args.unshift(actual_callback);
            dataprop.apply(controller, dataprop_args);
        }
        else {
            var dataprop = Eval.getExpressionProperty(propstr, controller, elem);
            (typeof dataprop === 'function') ? dataprop(actual_callback) : actual_callback(dataprop);
        }      
        
        function filterFn(data) {
            data = filter(data);
            callback(data);
        }
    }
    

    function prepare(templateHTML, filtered_ref, controller) {
        var fRe = /{{([^{}#\/\^\|@]+)\|([^{}]+)}}/g;
        var res = fRe.exec(templateHTML);
        while (res) {
            var varName = res[1].replace(/\s/g, "");
            var fName = res[2].replace(/\s/g, "");
            var propName = fName.replace(/\W/g, "_");
            filtered_ref[propName] = filtered_factory(fName);
            var repstr = '{{#'+ prefix + '.' + propName + '}}{{' + varName + '}}{{/'+ prefix + '.' + propName + '}}';
            templateHTML = templateHTML.replace(res[0], repstr);
            res = fRe.exec(templateHTML);
        }
        
        var fRe_sec_key = /{{#?\^?\/?(@?[^{}\|@]+)\|([^{}]+)}}/g;
        var res = fRe_sec_key.exec(templateHTML);
        while (res) {
            var varName = res[1].replace(/\s/g, "");
            var fName = res[2].replace(/\s/g, "");
            var combName = varName + '_' + fName;
            combName = combName.replace(/\W/g, '_');
            //check special chars
            if (varName[0] === '@') {
                combName = '_at_' + combName;
                varName = varName.substring(1);
                filtered_ref[combName] = filtered_factory_special(varName, fName);
            } else 
                filtered_ref[combName] = filtered_factory_special(varName, fName);
            var repstr = prefix + '.' + combName;
            templateHTML = templateHTML.replace(res[1]+'|'+res[2], repstr);
            res = fRe_sec_key.exec(templateHTML);
        }

        return templateHTML;
    }


    function filtered_factory(filter_str) {
        var parts = filter_str.split('|');
        var filter = filter_factory(parts, null);
        
        return function() {
            return function(text, mustache_render) {
                return filter(mustache_render(text));
            };
        };
    };
    
    
    function filtered_factory_special(varName, filter_str) {
        var parts = filter_str.split('|');
        var filter = filter_factory(parts, null);
        var name_parts = varName.split('.');
        //we provide two versions. One for direct object properties
        //and one for deeper
        
        var filteredFn;
        if (name_parts[0] === '.')
            name_parts.splice(0,1);
        if (name_parts.length === 0)
            filteredFn = simplethis;
        else
            filteredFn = name_parts.length > 1 ? deep : simple;
        
        function deep() {
            var value = this, i = 0;
            while (value && i < name_parts.length) {
                value = value[name_parts[i++]];
            }
            return filter(value);
        }
            
        function simple() {
            return filter(this[varName]); 
        }
        
        function simplethis() {
            return filter(this);
        }
            
        return filteredFn;
        
    }
    
    /*
     * Provides the all the filters in one function for the attribute
     */
    function filter_factory(filter_str_array, context) {
        var parts = filter_str_array;
        var filters = parse_filters(parts, context);
        var maara = filters.length;
        
        var f1 = filters.shift();
        var f2 = filters.shift();
        
        if (maara === 1) {
            return f1;
        }
        if (maara === 2) {
            return function(data) {
                data = f1(data);
                return f2(data);
            }
        }
        else {
            return function(data) {
                data = f1(data);
                data = f2(data);
                for (var i=0; i<filters.length; i++)
                    data = filters[i](data);
                return data;
            }
        }
    }
    
    
    function parse_filters(filter_expr_array, context) {
        var filters = [];
        for (var i=0; i<filter_expr_array.length; i++) {
            var filter_name = Parser.getPropName(filter_expr_array[i]);
            var args = Parser.isFnForm(filter_expr_array[i]) ?
                Eval.parseArguments(filter_expr_array[i], context) : [];
            args.unshift(filter_name);
            filters.push(Filters.apply(null, args));
        }
        return filters;
    }
    

})();
