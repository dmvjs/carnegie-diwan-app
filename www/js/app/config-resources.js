/**
 * Created by kirk on 6/1/16.
 */
var toLocal = require('./ui/getLocalizedString')
    , localStrings = require('./ui/localizedStrings')
    , getKey = require('./ui/getKeyForLanguageOrLocalCenter');


var links = {
    "ar": [{
        url: 'http://carnegie-mec.org/projects/'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegie-mec.org/regions/'
        , name: toLocal(localStrings.regions)
    }, {
        url: 'http://carnegie-mec.org/experts/'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegie-mec.org/events/'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegie-mec.org/publications/'
        , name: toLocal(localStrings.publications)
    }]
    , "en": [{
        url: 'http://carnegieendowment.org/topic/'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegieendowment.org/regions/'
        , name: toLocal(localStrings.regions)
    }, {
        url: 'http://carnegieendowment.org/experts/'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegieendowment.org/publications/'
        , name: toLocal(localStrings.publications)
    }, {
        url: 'http://carnegieendowment.org/events/'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegieendowment.org/programs/'
        , name: toLocal(localStrings.programs)
    }, {
        url: 'http://carnegieendowment.org/video/'
        , name: toLocal(localStrings.carnegieVideo)
    }, {
        url: 'http://carnegieendowment.org/infographics'
        , name: toLocal(localStrings.infographics)
    }]
    , "ru": [{
        url: 'http://carnegie.ru/issues/'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegie.ru/experts/'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegie.ru/events/'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegie.ru/publications/'
        , name: toLocal(localStrings.publications)
    }, {
        url: 'http://carnegie.ru/programs'
        , name: toLocal(localStrings.programs)
    }]
    , "zh": [{
        url: 'http://carnegietsinghua.org/issues/?lang=zh'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegietsinghua.org/experts/?lang=zh'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegietsinghua.org/events/?lang=zh'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegietsinghua.org/publications/?lang=zh'
        , name: toLocal(localStrings.publications)
    }, {
        url: 'http://carnegietsinghua.org/programs/?lang=zh'
        , name: toLocal(localStrings.programs)
    }]
    , "moscow": [{
        url: 'http://carnegie.ru/issues/?lang=en'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegie.ru/experts/?lang=en'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegie.ru/events/?lang=en'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegie.ru/publications/?lang=en'
        , name: toLocal(localStrings.publications)
    }, {
        url: 'http://carnegie.ru/programs/?lang=en'
        , name: toLocal(localStrings.programs)
    }]
    , "beijing": [{
        url: 'http://carnegietsinghua.org/issues'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegietsinghua.org/experts/'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegietsinghua.org/events/'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegietsinghua.org/publications/'
        , name: toLocal(localStrings.publications)
    }, {
        url: 'http://carnegietsinghua.org/programs/'
        , name: toLocal(localStrings.programs)
    }]
    , "beirut": [{
        url: 'http://carnegie-mec.org/projects/?lang=en'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegie-mec.org/regions/?lang=en'
        , name: toLocal(localStrings.regions)
    }, {
        url: 'http://carnegie-mec.org/experts/?lang=en'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegie-mec.org/events/?lang=en'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegie-mec.org/publications/?lang=en'
        , name: toLocal(localStrings.publications)
    }]
    , "brussels": [{
        url: 'http://carnegieeurope.eu/topic/'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegieeurope.eu/regions/'
        , name: toLocal(localStrings.regions)
    }, {
        url: 'http://carnegieeurope.eu/experts/'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegieeurope.eu/events/'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegieeurope.eu/publications/'
        , name: toLocal(localStrings.publications)
    }, {
        url: 'http://carnegieeurope.eu/publications/?lang=de'
        , name: 'Publikationen auf deutch'
    }, {
        url: 'http://carnegieeurope.eu/publications/?lang=fr'
        , name: 'Publications en français'
    }]
    , "newDelhi": [{
        url: 'http://carnegieindia.org/issues/'
        , name: toLocal(localStrings.issues)
    }, {
        url: 'http://carnegieindia.org/regions/'
        , name: toLocal(localStrings.regions)
    }, {
        url: 'http://carnegieindia.org/experts/'
        , name: toLocal(localStrings.experts)
    }, {
        url: 'http://carnegieindia.org/events/'
        , name: toLocal(localStrings.events)
    }, {
        url: 'http://carnegieindia.org/publications/'
        , name: toLocal(localStrings.publications)
    }]
};

var base = [{
    title: toLocal(localStrings.resources)
    , links: void 0
}];

function getResources (key) {
    if (links[key] !== undefined) {
        var resources = base;
        resources[0].links = links[key];
        return resources;
    }
    return void 0
}

module.exports = getResources(getKey());