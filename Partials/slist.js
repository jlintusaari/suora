/**
 * @deprecated use data-m-repeat instead
 * 
 * data-s-list="listFnName"
 * 
 * where controller[listFnName] is a function that takes a callback as an argument
 * and calls it with the data when it arrives.
 *
 * 
 */


(function() {
    
    var FILTERING_RE = /{{\s?(\S*)\s?\|\s?(.*)}}/;
    var FILTER_RE = /\s?([^:\s]*).*$/;

    function resolveFiltering(filtering, controller, Filters) {
        if (s.isString(filtering)) {
            filtering = FILTERING_RE.exec(filtering);
        }
        if (!filtering) {
            return;
        }
        var attrName = filtering[1],
                matchStr = filtering[0],
                filtersStrArr = filtering[2].replace(/\s/g, "");

        filtersStrArr = filtersStrArr.split('|');

        var filters = [],
                args = [];

        for (var i = 0; i < filtersStrArr.length; i++) {
            filters[i] = Filters(FILTER_RE.exec(filtersStrArr[i])[1]);
            args[i] = filtersStrArr[i].split(':');
            //the first space is reserved for the actual filtered value
            //therefore we don't need to remove the first element
            //it will be replaced

            //evaluate each argument, if hyphens then treated as string otherwise taken as a controller attribute
            for (var k = 1; k < args[i].length; k++) {
                var argStr = args[i][k];
                if (argStr[0] == '\'' || argStr[0] == "\"")
                    args[i][k] = argStr.slice(1, -1);
                else
                    args[i][k] = controller[argStr];
            }
        }
        return {
            attrName: attrName,
            matchStr: matchStr,
            filters: filters,
            args: args
        };
    }

    s.registerPartial('sList', function(element, controller) {
        var Filters = s.getService("Filters");
        var templateHtml = element.innerHTML;
        element.innerHTML = "";
        var listFnName = element.getAttribute("data-s-list");

        var render = function(list) {
            var mustacheTemplate = templateHtml;
            var attrsToFilter = [];

            //setup filtering and translate the template to mustache template
            var loopIdx = -1;
            while (true) {
                var filtering = FILTERING_RE.exec(mustacheTemplate);
                if (!filtering)
                    break;
                loopIdx++;

                var resolved = resolveFiltering(filtering, controller, Filters);
                resolved.filteredName = "_" + resolved.attrName + loopIdx.toString();
                mustacheTemplate = mustacheTemplate.replace(resolved.matchStr, "{{" + resolved.filteredName + "}}");

                attrsToFilter.push(resolved);
            }

            var linkFn = Mustache.compile(mustacheTemplate);

            var html = "";

            s.forEach(list, function(elem, key) { //forEach can be costly, consider for loop
                var data = {};
                s.extend(data, elem);
                for (var a = 0; a < attrsToFilter.length; a++) {
                    var filteredName = attrsToFilter[a].filteredName;
                    var filters = attrsToFilter[a].filters;
                    var args = attrsToFilter[a].args;
                    data[filteredName] = elem[attrsToFilter[a].attrName];
                    for (var k = 0; k < filters.length; k++) {
                        var filterFn = filters[k];
                        var argsNow = args[k];
                        //first argument is the element's attribute value
                        argsNow[0] = data[filteredName];
                        //and finally filter
                        data[filteredName] = filterFn.apply(null, argsNow);
                    }
                }
                html += linkFn(data);
            });

            element.innerHTML = html;
            
            /*
            //setup any special features of the created list
            
            var hides = element.getElementsByClassName("hide-conditional");
            for (var i=0; i < hides.length; i++) {
                if (hides[i].getAttribute("data-hide")) {
                    hides[i].style.display = 'none';
                }
            }
            */
        };
        
        function update() {
            element.innerHTML = "";
            controller[listFnName](render);
        }
        
        update();
        
        return( {
            _update: update,
            _dontCompile: true
        });
    });

}())



s.registerPartial("mustachedRepeat", function(elem, controller) {
    var Filters = s.getService("Filters");
    var prefix = "_mustacheRepeat";
    var templateHTML = elem.innerHTML;
    var templateHTML = "{{#" + prefix + "._tempdata}}" + templateHTML + "{{/" + prefix + "._tempdata}}";
    elem.innerHTML = "";
    
    //prepare the filters
    var filters = {};
    var fRe = /{{([^{}#]+)\|([^/{}]+)}}/g;
    var res = fRe.exec(templateHTML);
    while (res) {
        var varName = res[1].replace(/\s/g, "");
        var fName = res[2].replace(/\s/g, "");;
        var combName = varName + '_' + fName;
        filters[combName] = mustacheFilterFactory(varName, fName);
        var repstr = '{{' + prefix + '.' + combName + '}}'
        templateHTML = templateHTML.replace(res[0], repstr);
        res = fRe.exec(templateHTML);
    }
    
    var list = elem.getAttribute("data-mustache-repeat");
    if (!list)
        throw new Error("data-mustache-repeat: no attribute value given")
    //throw new Error("data-mustache-repeat: invalid attribute value " + list + ". Must be either an object or function.")
    
    var linkFn = Mustache.compile(templateHTML);
    
    update();
    
    function mustacheFilterFactory(varName, filterName) {
        var filter = Filters(filterName);
        return function() {
            var target = this[varName];
            if (typeof target == 'function')
                return filter(this[varName]());
            else
                return filter(this[varName]);
        }
    }
    
    function render(data) {
        if (controller[prefix])
            throw new Error("data-mustache-repeat: your controller " + controller._name + " must not have property " + prefix)
        controller[prefix] = filters;
        controller[prefix]["_tempdata"] = data;
        
        elem.innerHTML = linkFn(controller);
        
        delete controller[prefix];
    }
    
    function update() {
        elem.innerHTML = "";
        if (typeof controller[list] == 'function')
            controller[list](render);
        else
            render(controller[list]);
        
    }
    
    return( {
        _update: update,
        _dontCompile: true
    })
}, 1);
