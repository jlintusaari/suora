"use strict"

/*
 * Atm. datepicker doesn't upkeep any internal state of the last pick.
 * 
 * data-datepicker="controller_variable_to_save_the_date_on_pick or "now"
 * data-onpick="controllerFnName"   //gets the millisecs and datestr as passed args
 * data-dp-bind="controller_variable"
 * 
 * the picked dates have always time set to 00:00:00:00
 */

s.registerPartial("datepicker", function(elem, controller) {
    var Eval = s.getService("Eval");
    var dateformat = "d.m.Y";

    var data_datepicker = elem.getAttribute('data-datepicker');
    var data_onpick = elem.getAttribute('data-dp-onpick') || elem.getAttribute('data-onpick');
    var data_bind = elem.getAttribute('data-dp-bind');
    
    var dpicker = new datepickr(elem, {
        dateFormat: dateformat,
        onpick: savePick
    });
    
    if (data_datepicker) {
        if (data_datepicker == 'now') {
            elem.setAttribute("data-datepicker", "");
            data_datepicker = undefined;
            elem.value = dates.format(new Date().getTime(), dateformat);
        }
        else {
            var initvalue = Eval.exec(data_datepicker, controller);
            if (initvalue) {
                updateElementValue(initvalue);
            }
        }

    }
    
    if (data_bind) {
        if (typeof data_bind !== "string") {
            if (typeof data_datepicker !== "string")
                throw new Error("Datepicker-partial: invalid data-bind value given");
            data_bind = data_datepicker;
        }
    }

    //attach opening of the partial to the nearby button if specified
    if (elem.nextElementSibling && elem.nextElementSibling.hasAttribute("data-toggle-datepicker")) {
        elem.nextElementSibling.onclick = dpicker.open;
    }

    function updateElementValue(value) {
        //check if its an event, and then take the controller value
        if (!value || (value.target && value.type))
            value = Eval.exec(data_bind, controller);
        if (!value.getTime) {
            elem.value = dates.format(new Date(value).getTime(), dateformat);
        }
        else {
            elem.value = dates.format(value.getTime(), dateformat);
        }
    }

    function savePick(ms, datestr) {
        /*if (data_onpick) {
            controller[data_onpick](ms, datestr);
        }*/

        var savetarget = data_datepicker;
        if (savetarget) {
            savetarget = savetarget.split('.');
            var savetargetObj = controller;
            for (var i = 0; i < savetarget.length - 1; i++) {
                savetargetObj = savetargetObj[savetarget[i]];
            }
            savetargetObj[savetarget[i]] = new Date(ms);
            s.update();
        }
        s.fireEvent('datepick', elem);
    }


    function destroy() {
        dpicker.destroy();
        dpicker = null;
    }

    return {
        _update: data_bind ? updateElementValue : null,
        _destroy: destroy
    }
}, 50);


/*
 * <input type="text" data-hourpicker="controller_date_obj"
 *      data-init="value">
 */

/*
 (function() {
 function timepickerConstructor() {
 
 }
 })();
 */

s.registerPartial("hourpicker", function(elem, controller) {
    var INT_RE = /^[0-9]{1,2}$/;
    var previousValue = "00";

    function save(e) {
        var setvalue = elem.value;

        if (setvalue == "") {
            return;
        }
        else if (!INT_RE.test(setvalue)) {
            elem.value = previousValue;
            return;
        }

        if (setvalue.length > 1 && setvalue[0] == '0')
            setvalue = setvalue[1];

        if (setvalue < 0 || setvalue > 23) {
            elem.value = previousValue;
            return;
        }

        //succeeded
        previousValue = elem.value;

        if (elem.getAttribute("data-hourpicker")) {
            var datename = elem.getAttribute("data-hourpicker");
            var date = eval("controller." + datename);
            if (!date)
                return;
            else if (!date.setHours)
                throw new Error("hourpicker: " + datename + " is not a date object!")

            date.setHours(setvalue);

            //console.log(elem.value);
            //console.log(date)
        }

    }

    if (elem.hasAttribute("data-init")) {
        var initvalue = elem.getAttribute("data-init");
        var hours = 0;
        if (INT_RE.test(initvalue))
            hours = initvalue;
        else
            hours = eval("controller." + initvalue);
        elem.value = hours;
    } else {
        elem.value = previousValue;
    }

    save();

    //elem.onchange = save;
    //elem.onkeydown = save;
    //elem.onpaste = save;
    elem.oninput = save;

    elem.onblur = function() {
        if (elem.value == "")
            elem.value = previousValue;
        if (elem.value.length == 1) {
            elem.value = '0' + elem.value;
            save();
        }
    }

    return({
        _update: save
    });
}, 51)

/*
 * <input type="text" data-minutepicker="controller_date_obj"
 *      data-init="value">
 */

s.registerPartial("minutepicker", function(elem, controller) {
    var INT_RE = /^[0-9]{1,2}$/;
    var previousValue = "00";

    function save(e) {
        var setvalue = elem.value;

        if (setvalue == "") {
            return;
        }
        else if (!INT_RE.test(setvalue)) {
            elem.value = previousValue;
            return;
        }

        if (setvalue.length > 1 && setvalue[0] == '0')
            setvalue = setvalue[1];

        if (setvalue < 0 || setvalue > 59) {
            elem.value = previousValue;
            return;
        }

        //succeeded
        previousValue = elem.value;

        if (elem.getAttribute("data-minutepicker")) {
            console.log("yep")
            var datename = elem.getAttribute("data-minutepicker");
            var date = eval("controller." + datename);
            if (!date)
                return;
            else if (!date.setMinutes)
                throw new Error("minutepicker: " + datename + " is not a date object!")

            date.setMinutes(setvalue);

            //console.log(elem.value);
            //console.log(date)
        }
    }

    if (elem.getAttribute("data-init")) {
        var initvalue = elem.getAttribute("data-init");
        var minutes = 0;
        if (INT_RE.test(initvalue))
            minutes = initvalue;
        else
            minutes = eval("controller." + initvalue);
        elem.value = minutes;
    } else {
        elem.value = previousValue;
    }

    save();

    //elem.onchange = save;
    //elem.onkeydown = save;
    //elem.onpaste = save;
    elem.oninput = save;

    elem.onblur = function() {
        if (elem.value == "")
            elem.value = previousValue;
        if (elem.value.length == 1) {
            elem.value = '0' + elem.value;
            save();
        }
    }

    return({
        _update: save
    });

}, 52)