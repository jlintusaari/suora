"use strict";

s.registerPartial("toggleCheckboxes", function(elem) {
    function toggle() {
        var table = s.closest("table", elem);
        var inputs = table.querySelectorAll("input[type='checkbox']");
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].checked = elem.checked;
        }
    }
    elem.onclick = toggle;
    
});

/*
 * 
 * data-for-checked="fn"
 * data-for-checked="table_id:fn"
 * data-for-checked="event:table_id:fn"
 * 
 * 
 */

s.registerPartial("forChecked", function(elem, controller) {
    var E = s.getService("Eval");
    var V = s.getService("Validator");
    elem.onclick = function(event) {
        var attr = elem.getAttribute("data-for-checked");
        var fn = E.getProperty(attr, controller);
        var values= [];
        var inputs = document.querySelectorAll("table td input[type='checkbox']");
        for (var i = 0; i<inputs.length; i++) {
            var ielem = inputs[i];
            if (ielem.checked) {
                values.push(V.getElementProperty(ielem, "value"));
                ielem.checked = false;
            }
        }
        
        fn(values);
 
        var toggleCheckBox = document.querySelectorAll("table th input[type='checkbox']");
        if (toggleCheckBox.length > 0)
            toggleCheckBox[0].checked = false;
    };
});


/*
 * Deprecated
 * 
 */

s.registerPartial("tableToggleCheckboxes", function(elem) {
    function toggle() {
        var inputs = document.querySelectorAll("table.table-partial input.table-checkbox[type='checkbox']");
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].checked = elem.checked;
        }
    }
    elem.onclick = toggle;
    
});

s.registerPartial("tableChecked", function(elem, controller) {

    elem.onclick = function(event) {
        var FNNAME_RE = /(.*)\(.*/;
        var PARAM_RE = /.*\((.*)\);?/
        var attr = elem.getAttribute("data-table-checked");
        
        var fnName = FNNAME_RE.exec(attr)[1];
        var param = PARAM_RE.exec(attr)[1];
        var values= [];
        var inputs = document.querySelectorAll("table.table-partial tbody input.table-checkbox[type='checkbox']");
        for (var i = 0; i<inputs.length; i++) {
            var ielem = inputs[i];
            if (ielem.checked) {
                values.push(ielem.value);
                ielem.checked = false;
            }
        }
        
        controller[fnName](values);
 
        var toggleCheckBox = document.querySelectorAll("table.table-direktiivit thead input[type='checkbox']");
        if (toggleCheckBox.length > 0)
            toggleCheckBox[0].checked = false;
    };
});

/*
 * data-table-click="selector"
 * 
 * 
 * <clickTargetElem data-open-modal="modal_id"
 *                  data-eval="evalstr"         //is evaluated as controller.evalstr
 */

s.registerPartial("tableClick", function(elem, controller) {
    var match = elem.getAttribute("data-table-click");
    
    function handleClick(event) {
            //event.preventDefault();
            var telem = event.target;
            
            //https://developer.mozilla.org/en-US/docs/Web/API/Element.matches
            var matcher = telem.matches || telem.webkitMatchesSelector
                    || telem.mozMatchesSelector || telem.msMatchesSelector || telem.oMatchesSelector;
            
            if (!matcher)
                throw new Error("Error (table-click): matchesSelector not available!");
            
            if (matcher.call(telem,match)) {
                
                if (telem.hasAttribute("data-eval")) {
                    var evalstr = telem.getAttribute("data-eval");
                    evalstr.replace(" ", "");
                    evalstr = evalstr.split(';')
                    for (var i = 0; i < evalstr.length; i++) {
                        if (evalstr[i] == "")
                            break;
                        eval("controller." + evalstr[i]);
                    }
                }
                
                if (telem.hasAttribute("data-open-modal")) {
                    var modalId = telem.getAttribute("data-open-modal");
                    s.getService("Modals").open(modalId); 
                }
                else if (telem.hasAttribute("data-close-modal")) {
                    s.getService("Modals").close();
                }
            
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