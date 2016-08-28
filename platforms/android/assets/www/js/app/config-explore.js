var toLocal = require('./ui/getLocalizedString')
    , localStrings = require('./ui/localizedStrings')
    , getKey = require('./ui/getKeyForLanguageOrLocalCenter');


var links = {
    "ar": [{
        url: 'http://carnegie-mec.org/resources/?fa=register'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegie-mec.org/about/'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegie-mec.org/about/index.cfm?fa=privacy'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "en": [{
        url: 'http://carnegieendowment.org/resources/?fa=register'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegieendowment.org/about/'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegieendowment.org/about/development/'
        , name: toLocal(localStrings.supportCarnegie)
    }, {
        url: 'http://carnegieendowment.org/about/?fa=contact'
        , name: toLocal(localStrings.helpDesk)
    }, {
        url: 'http://carnegieendowment.org/about/index.cfm?fa=privacy'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "ru": [{
        url: 'http://carnegie.ru/resources/?fa=register'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegie.ru/about/'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegie.ru/about/index.cfm?fa=disclaimer'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "zh": [{
        url: 'http://carnegietsinghua.org/resources/?fa=register&lang=zh'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegietsinghua.org/about/?lang=zh'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegietsinghua.org/about/?fa=contact&lang=zh'
        , name: toLocal(localStrings.helpDesk)
    }, {
        url: 'http://carnegietsinghua.org/about/index.cfm?fa=privacy&lang=zh'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "moscow": [{
        url: 'http://carnegie.ru/resources/?fa=register&lang=en'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegie.ru/about/?lang=en'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegieendowment.org/support/'
        , name: toLocal(localStrings.supportCarnegie)
    }, {
        url: 'http://carnegie.ru/about/index.cfm?fa=disclaimer&lang=en'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "beijing": [{
        url: 'http://carnegietsinghua.org/resources/?fa=register'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegietsinghua.org/about/'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegieendowment.org/about/development'
        , name: toLocal(localStrings.supportCarnegie)
    }, {
        url: 'http://carnegietsinghua.org/about/?fa=contact'
        , name: toLocal(localStrings.helpDesk)
    }, {
        url: 'http://carnegietsinghua.org/about/index.cfm?fa=privacy'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "beirut": [{
        url: 'http://carnegie-mec.org/resources/?fa=register&lang=en'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegie-mec.org/about/?lang=en'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegietsinghua.org/about/?lang=zh'
        , name: toLocal(localStrings.supportCarnegie)
    }, {
        url: 'http://carnegie-mec.org/about/index.cfm?fa=privacy&lang=en'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "brussels": [{
        url: 'http://carnegieeurope.eu/resources/?fa=register'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegieeurope.eu/about/'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegieendowment.org/support/'
        , name: toLocal(localStrings.supportCarnegie)
    }, {
        url: 'http://carnegieeurope.eu/about/?fa=contact'
        , name: toLocal(localStrings.helpDesk)
    }, {
        url: 'http://carnegieeurope.eu/about/index.cfm?fa=privacy'
        , name: toLocal(localStrings.privacyStatement)
    }]
    , "newDelhi": [{
        url: 'http://carnegieindia.org/resources/?fa=register'
        , name: toLocal(localStrings.subscribe)
    }, {
        url: 'http://carnegieindia.org/about/'
        , name: toLocal(localStrings.aboutUs)
    }, {
        url: 'http://carnegieendowment.org/about/development'
        , name: toLocal(localStrings.supportCarnegie)
    }, {
        url: 'http://carnegieendowment.org/about/?fa=contact'
        , name: toLocal(localStrings.helpDesk)
    }, {
        url: 'http://carnegieindia.org/about/index.cfm?fa=privacy'
        , name: toLocal(localStrings.privacyStatement)
    }]
};

var base = [{
    title: toLocal(localStrings.explore)
    , links: void 0
}];

function getExplore (key) {
    if (links[key] !== undefined) {
        var explore = base;
        explore[0].links = links[key];
        return explore;
    }
    return void 0
}

module.exports = getExplore(getKey());