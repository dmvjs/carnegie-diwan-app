var toLocal = require('./ui/getLocalizedString')
    , localStrings = require('./ui/localizedStrings')
    , getKeyForLanguageOrLocalCenter = require('./ui/getKeyForLanguageOrLocalCenter');

var menus = [{
    title: ''
    , sub: toLocal(localStrings.readOffline)
    , feeds: [getLatestAnalysis()]
}];

function getLanguage () {
    var key = getKeyForLanguageOrLocalCenter();
    var language = 'en';
    if (['ar'].indexOf(key) > -1) {
        language = key;
    }
    return language
}

function getLatestAnalysis () {
    var key = getKeyForLanguageOrLocalCenter();
    var isLang = ['en', 'ar'].indexOf(key) > -1;
    var language = getLanguage();
    var urls = {
        en: 'http://carnegieendowment.org/rss/solr/?fa=AppDiwanEn'
        , ar: 'http://carnegieendowment.org/rss/solr/?fa=AppDiwanAr'
    };
    return {
        url: urls[key]
        , name: toLocal(localStrings.latestAnalysis)
        , filename: (isLang ? 'global-' : 'center-') + key + '.json'
        , type: 'json'
        , required: true
        , language: language
    }
}

module.exports = menus;