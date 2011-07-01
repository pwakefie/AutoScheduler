autoscheduler.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ autoscheduler.showFirefoxContextMenu(e); }, false);
};

autoscheduler.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-autoscheduler").hidden = gContextMenu.onImage;
};

window.addEventListener("load", function () { autoscheduler.onFirefoxLoad(); }, false);
