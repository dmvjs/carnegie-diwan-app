var header = require('./ui/header');
document.addEventListener("backbutton", onBackKeyDown, false);

function onBackKeyDown(e) {
    header.showStoryList();
    if (e.preventDefault) {
        e.preventDefault();
    }
    return false;
}
