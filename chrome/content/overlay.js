var autoscheduler = {
    onLoad: function() {
        // initialization code
        this.initialized = true; this.strings =
        document.getElementById("autoscheduler-strings");
    },
    
    win: null,

    onMenuItemCommand: function(e) {

        // This should be for options eventually
        // For now, using main window
        autoscheduler.onToolbarButtonCommand(e);
    },

    onToolbarButtonCommand: function(e) {

        if(!autoscheduler.win || autoscheduler.win.closed) {
            autoscheduler.win = window.open("chrome://autoscheduler/content/taskedit.xul",
                                        "autoschedulerTaskEdit", "chrome,centerscreen");
        } else {
            autoscheduler.win.close();
            autoscheduler.win = null;
        }
    }
};

window.addEventListener("load", function () { autoscheduler.onLoad(); }, false);
