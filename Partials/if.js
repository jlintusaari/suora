"use strict";

/**
 * 
 * 
 */

(function() {
    var booleanAttrs = ['disabled', 'hidden', 'checked', 'required'];

    for (var i in booleanAttrs) {
        var partialFn = booleanPartialFactory(booleanAttrs[i]);
        s.registerPartial(booleanAttrs[i] + "If", partialFn, 80);
    }

    s.registerPartial("classIf", function(elem, controller) {
        var pname = "data-class-if";
        var Eval = s.getService("Eval");
        update();
        function update() {
            var addclass = elem.getAttribute("data-class");
            var expr = elem.getAttribute(pname);
            if (Eval.isTrue(expr, controller, elem)) {
                if (elem.className.search(addclass) < 0)
                    elem.className = elem.className + " " + addclass;
            }
            else
                elem.className = elem.className.replace(" " + addclass, "");
        }
        return {
            _update: update
        }

    }, 80);

    s.registerPartial("visibleIf", function(elem, controller) {
        var Eval = s.getService("Eval");
        update();
        function update() {
            var expr = elem.getAttribute("data-visible-if");
            !Eval.isTrue(expr, controller, elem) ? elem.style.visibility = "hidden" : elem.style.visibility = "visible";
        }
        return {
            _update: update
        }
    }, 80)

    s.registerPartial("hideIf", function(elem, controller) {
        var Eval = s.getService("Eval");
        var original = elem.style.display;
        update();
        function update() {
            var expr = elem.getAttribute("data-hide-if");
            Eval.isTrue(expr, controller, elem) ? elem.style.display = "none" : elem.style.display = original;
        }
        return {
            _update: update
        }
    }, 80)



    function booleanPartialFactory(booleanAttr) {
        var pname = "data-" + booleanAttr + "-if";
        return function(elem, controller) {
            var Eval = s.getService("Eval");
            update();
            function update() {
                var expr = elem.getAttribute(pname);
                elem[booleanAttr] = Eval.isTrue(expr, controller, elem);
            }
            return {
                _update: update
            }
        }
    }

})();

