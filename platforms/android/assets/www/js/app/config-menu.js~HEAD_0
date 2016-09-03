var feeds = require('./config-feeds')
    , blogs = require('./config-blogs')
    , resources = require('./config-resources')
    , explore = require('./config-explore');

function makeMenu () {
    var menu = [];
    for (var i = 0; i < feeds.length; i += 1) {
        menu.push(feeds[i]);
    }
    /*if (blogs !== undefined) {
        for (i = 0; i < blogs.length; i += 1) {
            menu.push(blogs[i]);
        }
    }
    if (resources !== undefined) {
        for (i = 0; i < resources.length; i += 1) {
            menu.push(resources[i]);
        }
    }
    if (explore !== undefined) {
        for (i = 0; i < explore.length; i += 1) {
            menu.push(explore[i]);
        }
    }*/
    return menu;
}

module.exports = makeMenu();