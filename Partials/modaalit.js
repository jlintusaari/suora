/*******************************************************************************
 
 id                                  //required
 data-modal="url_of_modal_template"  //required
 data-onclose="controllerFn"
 data-update-onclose
 
 modal={
 id: string
 onclose: function
 partialOpen: function
 partialClose: function
 }
 
 *******************************************************************************/

"use strict";


s.registerService('Modals', function(element, controller) {
    var api = {};
    var modals = {};
    var opened = [];

    api.register = function(id, modaali) {
        modaali.id = id;
        if (modals[id]) {
            throw new Error("Modal with an id " + id + " already registered!");
        }
        modals[id] = modaali;
    }

    api.unregister = function(id) {
        if (modals[id])
            delete modals[id];
        else
            throw new Error("No modal with an id " + id + " found to unregister!");
        
        do {
            var found = false;
            for (var i = 0; i < opened.length; i++) {
                if (opened[i] == id) {
                    opened.splice(i, 1);
                    found = true;
                    break;
                }
            }
        } while (found)
    }

    api.open = function(id) {
        var modal = modals[id];
        if (!modal)
            throw new Error("Modals-service: no modal with an id " + id + " found");
        if (modal.opened)
            throw new Error("Modal " + id + " already opened!")
        opened.push(id);
        modal.opened = true;
        modal.partialOpen();
    };

    api.closeQuietly = function(id) {
        if (!id && opened.length > 0)
            id = opened[opened.length - 1];
        if (opened.length > 0 && opened[opened.length - 1] != id)
            return;
        opened.pop();

        var modaali = modals[id];
        if (!modaali) {
            throw new Error("No modal " + id + " registered!");
        }
        if (!modaali.opened) {
            throw new Error("Modal " + id + " was not opened!");
        }
        modaali.opened = false;
        modaali.partialClose();
        return modaali;
    }

    api.close = function(id, viesti) {
        if (!id && opened.length > 0)
            id = opened[opened.length - 1];
        var modaali = api.closeQuietly(id);
        if (!modaali)
            return;
        modaali.onclose ? modaali.onclose(viesti) : null;
        modaali.updateOnclose ? s.update() : null;
    };
    
    //debug
    //api.modals = modals;
    //api.opened = opened;
    
    return api;
});


s.registerPartial("modal", function(elem, controller) {
    var Modals = s.getService("Modals");
    var Compile = s.getService("Compile");
    var Templates = s.getService("TemplateCache");

    elem.className = elem.className + " modal";
    elem.setAttribute("style", "display: none;");

    var id = elem.getAttribute("id");
    var templateUrl = elem.getAttribute("data-modal");
    var onclose = controller[elem.getAttribute("data-onclose")];
    if (elem.hasAttribute("data-onclose") && !onclose) {
        throw new Error("data-modal " + id +": no onclose function found!");
    }
    var updateonclose = elem.hasAttribute("data-update-onclose") ? true : false;
    var compileObj;

    function close() {
        elem.setAttribute("style", "display: none;");
        if (compileObj)
            Compile.decompile(compileObj);
        compileObj = null;
        elem.innerHTML = "";
    }

    function open() {
        var template = Templates.get(templateUrl);
        elem.innerHTML = template;
        compileObj = Compile.children(elem, controller);
        elem.setAttribute("style", "");
        //position the element correctly
        var top = document.documentElement.scrollTop;// || document.body.scrollTop;
        top += 50;
        elem.style.top = top.toString() + "px";
    }

    Modals.register(id, {
        //passdata: passdata,
        onclose: onclose,
        updateOnclose: updateonclose,
        partialClose: close,
        partialOpen: open
    });

    function destroyPartial() {
        close();
        Modals.unregister(id);
    }

    return({
        _destroy: destroyPartial
    });

});

/*
 * Default event is click
 * 
 * data-open-modal=event:modal_id 
 * data-open-modal=modal_id
 * data-open-modal=event:
 * data-open-modal
 * 
 * The last two rely on target having the modal_id
*/

s.registerPartial("openModal", function(elem) {
    var partialName = "data-open-modal";
    var event = "click";
    if (elem.getAttribute(partialName)) {
        var parts = elem.getAttribute(partialName).split(':');
        event = parts.length === 2 ? parts[0] : event;
    }
    
    elem.addEventListener(event, handleEvent, false);
        
    var Modals = s.getService("Modals");
    
    function handleEvent(e) {
        var attrVal = e.target.getAttribute(partialName) || e.currentTarget.getAttribute(partialName);
        var parts = attrVal.split(':');
        var eventNow = parts.length === 2 ? parts[0] : event;
        var modalId = parts.length === 1 ? parts[0] : parts[1];
        
        if (modalId && eventNow === event)
            Modals.open(modalId);
    }
     
    function releaseEventHandler() {
        elem.removeEventListener(event, handleEvent, false);
    }
    
    return({
        _destroy: releaseEventHandler
    });
});



(function() {
    function close(event) {
        var Modals = s.getService("Modals");
        var evelem = event.currentTarget;
        while (evelem.parentNode) {
            if (evelem.hasAttribute("data-modal")) {
                Modals.close(evelem.getAttribute("id"));
                break;
            }
            evelem = evelem.parentNode;
        }
    }

    s.registerPartial("closeModal", function(elem, controller) {
        elem.onclick = close;
    });

    s.registerPartial("closeModalIf", function(elem, controller) {
        function checkIf() {
            var cond = elem.getAttribute("data-close-modal-if");
            if (controller[cond])
                close({currentTarget: elem});
        }
        
        return({
            _update: checkIf
        });
    });

})();




