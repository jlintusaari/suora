"use strict";
/**
 * data-form-reset="eventType", eventType defaults to click
 */

s.registerPartial("formReset", function(elem, controller) {
    var V = s.getService("Validator");
    var pname = "data-form-reset";
    var form = elem.form || s.closest('form', elem);
    if (!form)
        throw new Error(pname + ": could not locate a form element!");
    
    var etype = elem.getAttribute(pname) || "submit";
    if (etype == "enter")
        etype = "keypress";
    elem.addEventListener(etype, setReset, false);
    
    function resetForm() {
        if (!V.validateForm(form))
            return;
        var controls = form.elements;
        for (var i = 0; i < controls.length; i++) {
            controls[i].value = controls[i].getAttribute("value");
            if (controls[i].hasAttribute("autofocus"))
                controls[i].focus();
        }
    }
    
    function setReset(e) {
        if (etype == "keypress" && e.keyCode != 13)
            return;
        setTimeout(resetForm, 0);
    }
    
    function destroy() {
        elem.removeEventListener(etype, setReset, false);
    }
    
    return {
        _destroy: destroy
    }
})


/**
 * @deprecated
 * This will be deprecated in the future. Instead use onclick="controllerFn(form_selector)"
 * 
 * data-serialize-form="controllerFn(formIdorName)"
 */
s.registerPartial("serializeForm", function(elem, controller) {
    var V = s.getService("Validator");
    
    elem.onclick = function(event) {
        var attr = elem.getAttribute("data-serialize-form");
        var fnName = attr.replace(/\(.*\)/g,"");
        var ARG_RE = /^.*\((.*)\);?$/;
        if (!ARG_RE.test(attr) || ARG_RE.test(attr).length < 1)
            throw new Error("data-serialize-form: invalid attribute value: "+ attr +". Have you given the form id or name?");
        var formId = ARG_RE.exec(attr)[1];
         
        var form = document.forms[formId];
        var obj = {};
        //var inputs = form.getElementsByTagName("input");
        //var textareas = form.getElementsByTagName("textarea");
        var inputs = form.elements; //finds also the associated inputs
        
        var isFormValid = true;
        
        for (var i = 0; i<inputs.length; i++) {
            var name = inputs[i].name;
            if (!name)
                continue;
            if (!V.validateInput(inputs[i])) {
                isFormValid = false;
                break;
            }
            obj[name] = V.getInputValue(inputs[i]); 
        }
        
        if (isFormValid)
            controller[fnName](obj);
    }

});


/*
s.registerPartial("submit-onenter", function(elem, controller) {
    
})
*/

