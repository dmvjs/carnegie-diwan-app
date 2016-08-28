var toLocal = require('./ui/getLocalizedString')
    , localStrings = require('./ui/localizedStrings')
    , getKey = require('./ui/getKeyForLanguageOrLocalCenter');

var links = {
    "ar": [{
        url: 'http://carnegieendowment.org/rss/solr/?fa=AppDiwanAr'
        , name: 'Feed Arabic'
    }]
    , "en": [{
        url: 'http://carnegieendowment.org/rss/solr/?fa=AppDiwanEn'
        , name: 'Feed English'
    }]
};

var base = [{
    title: toLocal(localStrings.blogs)
    , links: void 0
}];

function getBlogs (key) {
    if (links[key] !== undefined) {
        var blogs = base;
        blogs[0].links = links[key];
        return blogs;
    }
    return void 0
}

module.exports = getBlogs(getKey());