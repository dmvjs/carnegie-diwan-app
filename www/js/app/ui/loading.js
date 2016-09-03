function hide (){
    $('.loading-ui').fadeOut();
}

function show (){
    $('.loading-ui').fadeIn();
}



module.exports = {
    hide: hide,
    show: show
};