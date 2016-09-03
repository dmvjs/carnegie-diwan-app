var toLocal = require('./ui/getLocalizedString')
    , localStrings = require('./ui/localizedStrings');

var menus = [{
    title: ''
    , sub: toLocal(localStrings.readOffline)
    , feeds: [{
        url: 'http://carnegieendowment.org/rss/solr/?fa=AppDiwanEn'
        , name: toLocal(localStrings.latestAnalysis)
        , filename: 'diwan-en.json'
        , type: 'json'
        , required: true
        , language: 'en'
    }, {
        url: 'http://carnegieendowment.org/rss/solr/?fa=AppDiwanAr'
        , name: toLocal(localStrings.latestAnalysis)
        , filename: 'diwan-ar.json'
        , type: 'json'
        , required: true
        , language: 'ar'
    }]
}];

module.exports = menus;