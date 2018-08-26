/** Ready made partials of the Suora framework
 * 
 * @suoradoc core
 * @name Partials
 * @description
 * 
 * Partials are kind of autonomyous miniprograms accessing the model through 
 * the provided controller. They are responsible for modifying the DOM and
 * rendering what the user sees.
 * 
 * Their factories are first registered and then instances of them are created when
 * the compiler service traverses the DOM and finds the corresponding name from
 * the element data attributes. 
 * 
 * They access the model through the provided controller. They are given 
 * instructions through the attributes of the element in which they are declared.
 * 
 * If they reserve memory they are to return an object with a destroy() function.
 * It will be called when the partial is no longer needed. The object can also
 * provide an update() function, which will be called every time when the framework
 * is updated, i.e. the model has changed and rerendering needs to take place. The 
 * framework will place an _id attribute on the object by which a handle to the
 * instance can be acquired from the framework.
 *
 * Note that data-s-render is sRender in the dataset object of the DOM, so register
 * partials with that camel-case style and use them with dashes in the HTML code.
 *
 * If you return boolean object attribute dontCompile, the compilation will not
 * go to the childs of the element
 */

/*
function f() {a.removeAttribute("style");
a.style.position = "static"; var opos = s.getPosition(a); console.log(opos); 
a.style.position="fixed"; var pos = s.getPosition(a); console.log(pos);
 a.style.position="relative"; a.style.left = (pos.x - opos.x) + "px"; a.style.top = (pos.y - opos.y) + "px";}

 *A better solution is probably to make the parent to grow large enough
 **/

s.registerPartial("scrollTo", function(elem, controller) {
    function scroll()  {
        elem.scrollIntoView(true);
    }
    
    return {
        _update: scroll
    }
});

s.registerPartial("toggleScroll", function(elem, controller) {
    function scroll()  {
        elem.scrollIntoView(true);
    }
    
    return {
        _exposeAPI: true,
        toggle: scroll
    }
});

/**
 * @deprecated use data-m-render instead
 */
s.registerPartial("sRender", function(element, controller) {
    var html = Mustache.render(element.innerHTML, controller);
    element.innerHTML = html;
}, 1);

/**
 * @deprecated use data-m-bind instead
 */

s.registerPartial("sBind", function(element, controller) {
    var html = element.innerHTML;
    function render() {
        element.innerHTML = Mustache.render(html, controller);
    }
    render();
    return({
        _update: render,
        _dontCompile: true
    });
}, 1);


/**
 * @deprecated use bindValue instead
 */

s.registerPartial("sBindValue", function(element, controller) {
    function updateValue() {
        if (!element.getAttribute("data-s-bind-value"))
            throw new Error("data-s-bind-value: no bindable controller variable given");
        var value = eval("controller." + element.getAttribute("data-s-bind-value"));
        if (value) {
            if (typeof value == 'object') {
                var propertyName = element.getAttribute("name");
                if (!propertyName)
                    throw new Error("data-s-bind-value: no name attribute specified " + element);
                value = value[propertyName];
            }
            if (value)
                element.value = value;
        }
    }
    
    updateValue();
    
    return({
       _update: updateValue
    });
});

s.registerPartial("sSetValue", function(element, controller) {
    function updateValue() {
        if (!element.getAttribute("data-s-set-value"))
            throw new Error("data-s-set-value: no settable controller variable given");
        var value = eval("controller." + element.getAttribute("data-s-set-value"));
        if (value) {
            if (typeof value == 'object') {
                var property = element.getAttribute("name");
                if (!property)
                    throw new Error("data-s-set-value: no name attribute specified for object property. " + element);
                value = value[property];
            }
            if (value)
                element.value = value;
        }      
    }
    
    updateValue();
});

s.registerPartial("sSetCheckedIf", function(element, controller) {
    function updateValue() {
        if (!element.getAttribute("data-s-set-checked-if"))
            throw new Error("data-s-set-checked-if: no settable controller variable given");
        var value = eval("controller." + element.getAttribute("data-s-set-checked-if"));
        if (value) {
            if (typeof value == 'object') {
                var property = element.getAttribute("name");
                if (!property)
                    throw new Error("data-s-set-checked-if: no name attribute specified for object property. " + element);
                value = value[property];
            }
            element.checked = !!value;
        }      
    }
    
    updateValue();
});

/*
 *  
 */

s.registerPartial("sInclude", function(element, controller) {
    var Templates = s.getService("TemplateCache");
    var url = element.dataset.sInclude;
    element.innerHTML = Templates.get(url);
});

/*
 * Only one view per app. No nested views. This can be easily changed f.e. by 
 * giving each view an id that is then used in Router routeobjects.
 */

s.registerPartial("sView", function(element, controller) {
    var Templates = s.getService("TemplateCache");
    var Compile = s.getService("Compile");
    var Router = s.getService("Router");
    var Controllers = s.getService("Controllers");
    var viewController;
    var prevRouteObj, prevCompileObj;
    
    Router.setCallback(compileView);
    
    function compileView(routeObj) {
        if (prevRouteObj) {
            Compile.decompile(prevCompileObj);
            if (viewController) Controllers.destroy(viewController);
        }
        
        var template = Templates.get(routeObj.template);
    
        element.innerHTML = template;
        
        //create controller instance
        if (routeObj.controller) viewController = Controllers.create(routeObj.controller);
        
        var compileObj = Compile.children(element, viewController || controller);
        
        prevRouteObj = routeObj;
        prevCompileObj = compileObj;
    }
    
    return({
        _dontCompile: true
    });
});





//@deprecated. Will be automatically set if any routes are defined
s.registerPartial("sRouteLinks", function(elem, controller) {
    var Router = s.getService("Router");
    
    function handleClick(event) {
            var telem = event.target;

            var routeurl = "";
            if (telem.hasAttribute("href")) {
                routeurl = telem.getAttribute("href");    
            }
            else if (telem.parentNode.hasAttribute("href")) {
                routeurl = telem.parentNode.getAttribute("href");    
            }
            
            if (routeurl) {
                event.preventDefault();
                Router.route(routeurl);
                console.log("routing to" + routeurl)
            }
    }
    
    elem.addEventListener("click", handleClick);
    
    function destroy() {
        elem.removeEventListener("click", handleClick);
    }
    
    return {
        _destroy: destroy
    }
});

s.registerPartial("sOnclick", function(elem, controller) {
    var fn = elem.getAttribute("data-s-onclick");
    var fnName = fn.replace(/\(.*\)/g,"");
    //var fn_argument
    elem.onclick = controller[fnName];
});



s.registerPartial("sOnchange", function(elem, controller) {
    function handler() {
        var fn = elem.getAttribute("data-s-onchange");
        var fnName = fn.replace(/\(.*\)/g,"");
        var fnArg = /\('?([^']*)'?\)/.exec(fn)[1];
        controller[fnName](fnArg);
    }
    elem.onchange = handler;
});



/**
 * @deprecated use form-show-if instead
 */

s.registerPartial("sFormToggle", function(elem, controller) {
    function check(e) {
        if (e.currentTarget.checked) {
            elem.style.display = "";
        }
        else {
            elem.style.display = "none";
        }
            
    }
    
    elem.style.display = "none";
    
    var checkboxname = elem.getAttribute("data-s-form-toggle").split('.');
    var checkbox = document.forms[checkboxname[0]];
    if (!checkbox)
        throw new Error("sFormToggle: form with name " + checkbox[0] + " not found!")
    checkbox = checkbox[checkboxname[1]];
    if (!checkbox) {
        throw new Error("sFormToggle: checkbox with name " + checkbox[1] + " in form " + checkbox[0] + " not found!")
    }
    
    checkbox.onclick = check;
})