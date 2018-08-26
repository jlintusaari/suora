"use strict";


(function() {
    var onEvents = ['onclick', 'ondblclick', 'onmousedown', 'onmousemove',
        'onmouseover', 'onmouseout', 'onmouseup', 'onkeydown', 'onkeypress',
        'onkeyup', 'onblur', 'onchange', 'onfocus', 'onreset', 'onselect',
        'onsubmit', 'oninput'];
    
    var customEvents = ['onpick']
    
    var kbEvents = [{name: 'onenter', keycode: 13}, {name: 'onesc', keycode: 27}];

    for (var i in onEvents) {
        var partialFn = eventPartialFactory(onEvents[i]);
        s.registerPartial(onEvents[i], partialFn);
    }
    
    for (var i in customEvents) {
        var partialFn = customeventPartialFactory(customEvents[i]);
        s.registerPartial(customEvents[i], partialFn);
    }

    //create custom keyboard events
    for (var i in kbEvents) {
        var pfn = keyboardPartialFactory(kbEvents[i].name, kbEvents[i].keycode);
        s.registerPartial(kbEvents[i].name, pfn);
    }

    s.registerPartial("sUpdate", function(elem, controller) {
        var events = elem.getAttribute("data-s-update") || "click";
        events = events.split(',');
        for (var i in events) {
            var e = events[i];
            if (e[0] === 'o' && e[1] === 'n')
                e = e.substring(2);
            elem.addEventListener(e, timeoutsUpdate);
        }
        
        function release_event_listener() {
            for (var i in events) {
                var e = events[i];
                if (e[0] === 'o' && e[1] === 'n')
                    e = e.substring(2);
                elem.removeEventListener(e, timeoutsUpdate);
            }
        }
        return {_destroy: release_event_listener}
    });
    
    /*
     * data-update:event1,event2:elem1,elem2,elem3
     * if the partial exposes toggle function, this will also call it.
     */
    s.registerPartial("update", function(elem, controller) {
        var attrval = elem.getAttribute("data-update");
        
        try {
            var res = /([^:]+):(.+)/.exec(attrval);
            var events_arr = res[1].split(',');
            var selectors = res[2].split(',');
            
        } catch(e) {
            throw new Error("data-update: invalid attribute value, "+ attrval);
        }
        
        var targets = [];
        for (var i=0; i<selectors.length; i++) {
            var target = s(selectors[i]);
            if (!target)
                throw new Error("data-update: target element not found, "+ attrval);
            targets.push(target);
        }

        for (var ei=0;ei<events_arr.length;ei++) {
            for (var ti=0; ti<targets.length; ti++) {
                    targets[ti].addEventListener(events_arr[ei], update);
            }
        }

        function release_event_listeners() {
            for (var ei=0;ei<events_arr.length;ei++) {
                for (var ti=0; ti<targets.length; ti++) {
                    targets[ti].removeEventListener(events_arr[ei], update);
                }
            }
        }
        
        function update() {
            var ps = s.getPartialsFromElement(elem);
            for (var i=0; i<ps.length; i++) {
                var pi = ps[i];
                if (typeof pi._update === "function")
                    ps[i]._update();
                if (typeof pi.toggle === "function")
                    ps[i].toggle();
            }
        }
        
        return {
            _destroy: release_event_listeners
        }
    }, 100);
    
    function timeoutsUpdate() {
        setTimeout(s.update, 0);
    }
    
    function eventHandler(e) {
        if (e.type=="submit") {
            e.preventDefault();
        }
        var Eval = s.getService("Eval");
        
        var elem, expr;
        if (e.currentTarget.getAttribute("data-on" + e.type)){
            elem = e.currentTarget;
            expr = elem.getAttribute("data-on" + e.type);
        }
        else {
            elem = e.target;
            expr = elem.getAttribute("data-on" + e.type);
        }
        
        if (!expr)
            return;
        
        var controller = s.getService("Controllers").get(e.currentTarget.getAttribute("data-controller-id"));
        Eval.exec(expr, controller, elem);
    }

    function eventPartialFactory(eventname) {
        return function(elem, controller) {
            elem.setAttribute("data-controller-id", controller._id);
            elem[eventname] = eventHandler;
        };
    };
    
    function customeventPartialFactory(eventname) {
        return function(elem, controller) {
            elem.setAttribute("data-controller-id", controller._id);
            elem.addEventListener(eventname, eventHandler);
            return {
                _destroy: remove_event_listener
            }
            
            function remove_event_listener() {
                elem.removeEventListener(eventname, eventHandler);
            }
        }
        
    }

    function keyboardPartialFactory(eventname, keycode) {
        return function(elem, controller) {
            var Eval = s.getService("Eval");
            elem.setAttribute("data-controller-id", controller._id);
            elem['onkeypress'] = checkPress;

            function checkPress(e) {
                if (e.keyCode != keycode)
                    return;
                var expr = elem.getAttribute("data-"+ eventname);
                Eval.exec(expr, controller, elem);
            }
        };
    }

})();