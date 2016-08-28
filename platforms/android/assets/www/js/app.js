(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*global require, module, $*/
var notify = require('../util/notify')
  , config = require('./config')
  , menu = require('./config-menu')
  , connection = require('../util/connection')
  , createFileWithContents = require('../io/createFileWithContents')
  , getFileContents = require('../io/getFileContents')
  , doesFileExist = require('../io/doesFileExist')
  , toJson = require('./xmlToJson')
  , downloadExternalFile = require('../io/downloadExternalFile')
  , getFileList = require('../io/getFileList')
  , removeFile = require('../io/removeFile')
  , currentFeedId = void 0
  , feedRefresh = []
  , increment = 60000;

function getFeed(id, loadOnly) {
  return new Promise(function (resolve, reject) {
    if (!loadOnly) {
        currentFeedId = id;
    }
    get(id).then(function (fileentry) {
      console.log(fileentry, name);
      var filename;
      if (fileentry.name) {
        filename = fileentry.name;
      } else if (fileentry.target && fileentry.target.localURL) {
        filename = fileentry.target.localURL.split('/').pop();
      } else if (fileentry.target && fileentry.target._localURL) {
        filename = fileentry.target._localURL.split('/').pop();
      }
      getFileContents(filename).then(function (contents) {
        var obj = (JSON.parse(contents.target._result));
        getImages(obj).then(function () {
          removeOrphanedImages().then(function () {
            resolve(contents);
          }, reject);
        }, reject);
      }, reject)
    }, reject)
  })
}

function refresh() {
  return new Promise(function (resolve, reject) {
    var id = currentFeedId || 0
      , filename = getFilenameFromId(id)
      , since = 0
      , last = feedRefresh[id]
      , now = new Date().valueOf();

    if (last !== undefined) {
      since = (now - last) > increment;
    }
    if (last === undefined || since) {
      feedRefresh[id] = now;
      getFeed(id).then(function (contents) {
	      var obj = (JSON.parse(contents.target._result));
        $(document).trigger('access.refresh', [obj, filename]);
        resolve(obj);
      }, reject);
        if (config.track && analytics) {
        analytics.trackEvent('StoryList', 'Feed', 'Pull to Refresh', 10);
      }
    } else {
      setTimeout(function () {
        reject('Delaying refresh');
      if (config.track && analytics) {
          analytics.trackEvent('StoryList', 'Feed', 'Pull to Refresh Fake', 10);
        }
      }, 2000);
    }
  })
}

function getStoryImageCount(element) {
  return element.image !== undefined
}

function getImages(feedObject) {
  return new Promise(function (resolve, reject) {
    var i = 0
      , stories = feedObject.story ? feedObject.story : feedObject.item
      , items = stories.filter(getStoryImageCount).length
      , prevPromise = Promise.resolve();

    stories.forEach(function(obj) {
      if (obj.image) {
        prevPromise = prevPromise.then(function() {
          return downloadExternalFile(obj.image);
        }).then(function(data) {
          i += 1;
          if (i === items) {
            resolve(data);
          }
        }).catch(reject);
      }
    });
  })
}

function getFeedsFromConfig () {
  var feeds = [];
  menu.forEach(function (item) {
    if (item.feeds) {
      item.feeds.forEach(function (el) {
        feeds.push(el);
      })
    }
  });
  return feeds;
}

function getFeedFromConfig(id) {
  return getFeedsFromConfig()[id];
}

function getFilenameFromFeed(feed) {
  return feed.filename || feed.url.split('/').pop().split('.').shift() + '.json';
}

function getFeedNameFromId(id) {
  var feed = getFeedFromConfig(id);
  return feed.name;
}

function getFilenameFromId(id) {
  var feed = getFeedFromConfig(id);
  return getFilenameFromFeed(feed)
}

function getCurrentId() {
  return currentFeedId || 0;
}

function get(id) {
  // resolves when feed is downloaded
  return new Promise(function (resolve, reject) {
    var feed = getFeedFromConfig(id)
      , url = feed.url
      , type = feed.type || 'xml'
      , filename = feed.filename || url.split('/').pop().split('.').shift() + '.json';

    if (navigator.connection.type !== 'none') {
      $.ajax({
        url: url
        , dataType: type
      }).then(function (res) {
        var obj = (type === 'json' ? (res && res.rss && res.rss.channel) : toJson(res));
        doesFileExist(filename).then(function () {
          //file exists
          getFileContents(filename).then(function (contents) {
	          var o = (JSON.parse(contents.target._result));
            if ((o.lastBuildDate === obj.lastBuildDate) && !isAnyCommentNew(obj, o)) {
              //no updates since last build
              resolve(contents);
            } else {
              createFileWithContents(filename, JSON.stringify(obj)).then(resolve, reject);
            }
          }, reject);// file was created but doesn't exist? unlikely
        }, function () {
          //file does not exist
          createFileWithContents(filename, JSON.stringify(obj)).then(resolve, reject);
        });
      }, reject);
    } else {
      doesFileExist(filename).then(resolve, reject);
    }
    removeOrphanedJSONFiles()
  })
}

// if any lastCommentPosted prop doesn't match it's twin then a comment has been updated
function isAnyCommentNew (o1, o2) {
    var updated = false;
    if (o1 && o1.item && o1.item.length > 0 && o2 && o2.item && o2.item.length > 0) {
        $.each(o1.item, function (i, e) {
            var x = o2.item[i];
            if (e.lastCommentPosted !== x.lastCommentPosted) {
                updated = true;
                return false;
            }
        });
    }
    return updated;
}

function removeOrphanedJSONFiles() {
  getFileList().then(function (response) {
    var json = response.filter(function (element) {return element.name.split('.').pop() === 'json'})
        , fileNames = json.map(function (element) {return element.name})
        , filesInFeeds = getFeedsFromConfig().map(function (el) {return el.filename}),
        filesToDelete = [];
    fileNames.forEach(function (name) {
      if (filesInFeeds.indexOf(name) === -1) {
        filesToDelete.push(name);
      }
    });
    filesToDelete.map(removeFeedByFilename);
  });
}

function removeFeedByFilename(filename) {
  return new Promise(function (resolve, reject) {
    doesFileExist(filename).then(function (fileentry) {
      removeFile(fileentry).then(function () {
        removeOrphanedImages().then(resolve, reject);
      }, reject)
    }, reject);
  })
}

function removeOrphanedImages() {
  return new Promise(function (resolve, reject) {
    var images = ['image-unavailable_605x328.png'];
    getFileList().then(function (response) {
      var json = response.filter(function (element) {return element.name.split('.').pop() === 'json'})
        , imageFiles = response.filter(function (element) {
            var ext = element.name.split('.').pop();
            return ext === 'jpg' || ext === 'png' || ext === 'jpeg'
          })
        , filenames = json.map(function (element) {return element.name});

      Promise.all(
        filenames.map(getFileContents)
      ).then(function (res) {
        var imagesToRemove;
        res.forEach(function (el) {
          var obj = (JSON.parse(el.target._result))
            , stories = obj.story ? obj.story : obj.item;

          stories.forEach(function (ele) {
            if (ele.image && images.indexOf(ele.image.split('/').pop()) === -1) {
              images.push(ele.image.split('/').pop())
            }
          })
        });
        imagesToRemove = imageFiles.filter(function(val) {
          return images.indexOf(val.name) === -1;
        });
        Promise.all(imagesToRemove.map(removeFile)).then(resolve, reject)
      });
    }, reject)
  })
}

function removeFeed(id) {
	return new Promise(function (resolve, reject) {
		var filename = getFilenameFromId(id);

		doesFileExist(filename).then(function (fileentry) {
			removeFile(fileentry).then(function () {
				removeOrphanedImages().then(resolve, reject);
			}, reject)
		}, reject);
	})
}

module.exports = {
  get: getFeed
  , getCurrentId: getCurrentId
  , getFeedNameFromId: getFeedNameFromId
  , getFilenameFromId: getFilenameFromId
  , getFilenameFromFeed: getFilenameFromFeed
  , removeFeed: removeFeed
  , refresh: refresh
  , getFeedsFromConfig: getFeedsFromConfig
};
},{"../io/createFileWithContents":24,"../io/doesFileExist":25,"../io/downloadExternalFile":26,"../io/getFileContents":29,"../io/getFileList":31,"../io/removeFile":36,"../util/connection":38,"../util/notify":41,"./config":8,"./config-menu":6,"./xmlToJson":20}],2:[function(require,module,exports){
module.exports = {
    track: true
    , trackId: 'UA-31877-29'
};
},{}],3:[function(require,module,exports){
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
},{"./ui/getKeyForLanguageOrLocalCenter":11,"./ui/getLocalizedString":12,"./ui/localizedStrings":14}],4:[function(require,module,exports){
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
},{"./ui/getKeyForLanguageOrLocalCenter":11,"./ui/getLocalizedString":12,"./ui/localizedStrings":14}],5:[function(require,module,exports){
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
},{"./ui/getKeyForLanguageOrLocalCenter":11,"./ui/getLocalizedString":12,"./ui/localizedStrings":14}],6:[function(require,module,exports){
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
},{"./config-blogs":3,"./config-explore":4,"./config-feeds":5,"./config-resources":7}],7:[function(require,module,exports){
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
},{"./ui/getKeyForLanguageOrLocalCenter":11,"./ui/getLocalizedString":12,"./ui/localizedStrings":14}],8:[function(require,module,exports){
/*global module, require*/
var analyticsConfig = require('./analyticsConfig')
	, toLocal = require('./ui/getLocalizedString')
	, localStrings = require('./ui/localizedStrings');

module.exports = {
	fs: void 0
	, appName: 'Carnegie'
	, track: analyticsConfig.track
	, trackId: analyticsConfig.trackId
	, folder: 'com.ceip.carnegie'
	, storyFontSize: 1.0
	, connectionMessage: toLocal(localStrings.noNetworkConnection)
	, menuMessage: toLocal(localStrings.notYetDownloaded)
	, missingImage: 'http://carnegieendowment.org/app-img-not-avail.png'
	, missingImageRef: void 0
};
},{"./analyticsConfig":2,"./ui/getLocalizedString":12,"./ui/localizedStrings":14}],9:[function(require,module,exports){
module.exports = function () {
	var config = require('./config')
		, notify = require('../util/notify')
		, doesFileExist = require('../io/doesFileExist')
		, downloadExternalFile = require('../io/downloadExternalFile')
		, toLocal = require('./ui/getLocalizedString')
		, localStrings = require('./ui/localizedStrings');

	return new Promise(function (resolve, reject) {

		function init(response) {
			var ref = response.toURL();

			config.missingImageRef = response;
			resolve(response);
		}

		function getImage(reason) {

			if (navigator.connection.type !== 'none') {
				downloadExternalFile(config.missingImage).then(init, reject);
			} else {
				notify.alert(config.connectionMessage, getImage, null, toLocal(localStrings.tryAgain));
			}
		}

		doesFileExist(config.missingImage.split('/').pop()).then(init, getImage);
	})
}
},{"../io/doesFileExist":25,"../io/downloadExternalFile":26,"../util/notify":41,"./config":8,"./ui/getLocalizedString":12,"./ui/localizedStrings":14}],10:[function(require,module,exports){
var header = require('./ui/header');
document.addEventListener("backbutton", onBackKeyDown, false);

function onBackKeyDown(e) {
    header.showStoryList();
    if (e.preventDefault) {
        e.preventDefault();
    }
    return false;
}

},{"./ui/header":13}],11:[function(require,module,exports){
module.exports = function () {
    return window.__languageForCarnegie || window.__localCenter || "en";
};

},{}],12:[function(require,module,exports){
module.exports = function (options, language) {
    if (options !== undefined) {
        if (language !== undefined) {
            if (language === "ar" && options["ar"] !== undefined) {
                return options["ar"];
            } else if (language === "zh" && options["zh"] !== undefined) {
                return options["zh"];
            } else if (language === "ru" && options["ru"] !== undefined) {
                return options["ru"];
            } else if (options["en"] !== undefined) {
                return options["en"];
            }
        }
        if (window.__languageForCarnegie === "ar" && options["ar"] !== undefined) {
            return options["ar"];
        } else if (window.__languageForCarnegie === "zh" && options["zh"] !== undefined) {
            return options["zh"];
        } else if (window.__languageForCarnegie === "ru" && options["ru"] !== undefined) {
            return options["ru"];
        } else if (options["en"] !== undefined) {
            return options["en"];
        }
    }
    return void 0
};
},{}],13:[function(require,module,exports){
/*global $, require, module */
var story = require('./story');

$(document)
	.on('touchstart', 'header .show-menu', function (e) {
		$(e.currentTarget).addClass('active');
	})
	.on('touchend', 'header .show-menu', function (e) {
		var ui = $(e.currentTarget);
		setTimeout(function () {
			$('header').addClass('stay');
			if ($('section.menu').hasClass('active')) {
				showStoryList();
			} else {
				showMenu();
			}
			ui.removeClass('active');
		}, 100);
	})
	.on('touchstart', 'header .story .back', function (e) {
		$(e.currentTarget).addClass('active');
	})
	.on('touchend', 'header .story .back', function (e) {
		var ui = $(e.currentTarget);
		setTimeout(function () {
			showStoryList();
			ui.removeClass('active');
		}, 100);
	});

addListeners();

function addListeners() {
  addListener('previous');
  addListener('next');
}

function removeListeners() {
  removeListener('previous');
  removeListener('next');
}

function removeListener(className) {
  if (className === 'previous' || className === 'next') {
    $(document)
			.off('touchstart', 'header .story .btn-group .' + className)
			.off('touchend', 'header .story .btn-group .' + className);
  }
}

function addListener(className) {
  if (className === 'previous' || className === 'next') {
    $(document)
			.on('touchstart', 'header .story .btn-group .' + className, function (e) {
				$(e.currentTarget).addClass('active');
				setTimeout(function () {
					story[className]();
				}, 0);
			})
			.on('touchend', 'header .story .btn-group .' + className, function (e) {
				var ui = $(e.currentTarget);
				removeListeners();
				setTimeout(function () {
					addListeners();
					ui.removeClass('active');
				}, 350)
			})
  }
}

function show(sel) {
	var sels = ['.menu', '.story', '.story-list']
		, $h = $('header')
		, $sel = $h.find(sel).stop(true);

	sels.splice(sels.indexOf(sel), 1);

	sels.forEach(function (el) {
		var $el = $h.find(el);

		$el.removeClass('active');
	});

  $sel.addClass('active');
}

function showStoryList() {
	$('section.story').removeClass('active');
	$('section.story-list').addClass('active');
	$('section.menu').removeClass('active');
	$('footer.story-footer').removeClass('active');
	show('.story-list');
	story.hide();
}

function showMenu() {
	$('section.menu').addClass('active');
	show('.menu');
}

function showStory() {
	$('header').removeClass('stay');
	$('section.menu').removeClass('active');
	$('footer.story-footer').addClass('active');
	$('section.story').addClass('active');
	show('.story');
}

function setBackLabelText (text) {
	$('header .story .back .label').text(text);
}

module.exports = {
	showStoryList: showStoryList
	, showMenu: showMenu
	, showStory: showStory
	, setBackLabelText: setBackLabelText
};
},{"./story":18}],14:[function(require,module,exports){
/**
 * Created by kirk on 4/16/16.
 */
module.exports = {
    "": {
        en: "",
        zh: "",
        ar: "",
        ru: ""
    },
    aboutUs: {
        en: "About Us",
        zh: "关于我们",
        ar: "من نحن",
        ru: "О нас"
    },
    arabic: {
        en: "Arabic",
        zh: "阿拉伯语",
        ar: "عربي",
        ru: "Арабский"
    },
    back: {
        en: "Back",
        zh: "返回",
        ar: "رجوع",
        ru: "Назад"
    },
    beijing: {
        en: "Beijing",
        zh: "北京",
        ar: "بيجينغ",
        ru: "Пекин"
    },
    beirut: {
        en: "Beirut",
        zh: "贝鲁特",
        ar: "بيروت",
        ru: "Бейрут"
    },
    blogs: {
        en: "Blogs",
        zh: "博客",
        ar: "مدوّنات",
        ru: "Блог"
    },
    brussels: {
        en: "Brussels",
        zh: "布鲁塞尔",
        ar: "بروكسل",
        ru: "Брюссель"
    },
    cancel: {
        en: "Cancel",
        zh: "取消",
        ar: "إلغاء",
        ru: "Отмена"
    },
    carnegieVideo: {
        en: "Carnegie Video",
        zh: "卡内基视频",
        ar: "فيديو كارنيغي",
        ru: "Видео Карнеги"
    },
    chinese: {
        en: "Chinese",
        zh: "中文",
        ar: "الصينية",
        ru: "Китайский"
    },
    english: {
        en: "English",
        zh: "英语",
        ar: "الانكليزية",
        ru: "Английский"
    },
    events: {
        en: "Events",
        zh: "会议",
        ar: "الأنشطة",
        ru: "События"
    },
    experts: {
        en: "Experts",
        zh: "专家",
        ar: "الباحثون",
        ru: "Эксперты"
    },
    explore: {
        en: "Explore",
        zh: "发现更多",
        ar: "معلومات إضافية",
        ru: "Меню"
    },
    globalCenters: {
        en: "Global Centers",
        zh: "国际中心",
        ar: "المراكز في العالم",
        ru: "Центры Карнеги в мире"
    },
    helpDesk: {
        en: "Help Desk",
        zh: "信息咨询",
        ar: "مكتب المساعدة",
        ru: "Служба поддержки"
    },
    infographics: {
        en: "Infographics",
        zh: "信息图",
        ar: "رسوم بيانية",
        ru: "Инфографика"
    },
    issues: {
        en: "Issues",
        zh: "主题",
        ar: "القضايا",
        ru: "Темы"
    },
    languages: {
        en: "Languages",
        zh: "语言",
        ar: "اللغات",
        ru: "Языки"
    },
    latestAnalysis: {
        en: "Latest Analysis",
        zh: "最新分析",
        ar: "آخر التحليلات",
        ru: "Недавние публикации"
    },
    moscow: {
        en: "Moscow",
        zh: "莫斯科",
        ar: "موسكو",
        ru: "Москва"
    },
    mostPopular: {
        en: "Most Popular",
        zh: "最受欢迎",
        ar: "الأكثر قراءةً",
        ru: "Самое популярное "
    },
    newDelhi: {
        en: "New Delhi",
        zh: "新德里",
        ar: "نيو دلهي",
        ru: "Дели"
    },
    noNetworkConnection: {
        en: "No network connection detected",
        zh: "未检测到网络连接",
        ar: "الاتصال بشبكة الإنترنت غير متوفّر حاليّاً",
        ru: "Нет соединения с сервером"
    },
    notYetDownloaded: {
        en: "Not yet downloaded",
        zh: "还未下载",
        ar: "لم يتم التنزيل بعد",
        ru: "Загрузка не завершена"
    },
    ok: {
        en: "OK",
        zh: "好",
        ar: "حسنا",
        ru: "Xорошо"
    },
    privacyStatement: {
        en: "Privacy Statement",
        zh: "隐私声明",
        ar: "بيان الخصوصية",
        ru: "Обеспечение конфиденциальности"
    },
    processingErrorMessage: {
        en: "There was an error processing the feed. Try again in a few minutes.",
        zh: "处理错误。在几分钟后再试一次。",
        ar: "خطأ معالجة. حاول مرة أخرى في بضع دقائق.",
        ru: "Обработка ошибок. Повторите попытку через несколько минут."
    },
    programs: {
        en: "Programs",
        zh: "项目",
        ar: "البرامج",
        ru: "Программы"
    },
    publications: {
        en: "Publications",
        zh: "出版物",
        ar: "الاصدارات",
        ru: "Публикации"
    },
    readOffline: {
        en: "Read offline",
        zh: "离线阅读",
        ar: "للقراءة خارج الإنترنت",
        ru: "Читать офлайн"
    },
    regions: {
        en: "Regions",
        zh: "地区",
        ar: "المناطق",
        ru: "Регионы"
    },
    resources: {
        en: "Resources",
        zh: "资源",
        ar: "الموارد",
        ru: "Ресурсы"
    },
    russian: {
        en: "Russian",
        zh: "俄语",
        ar: "الروسية",
        ru: "Русский"
    },
    subscribe: {
        en: "Subscribe",
        zh: "订阅",
        ar: "تسجَّل",
        ru: "Подписаться"
    },
    supportCarnegie: {
        en: "Support Carnegie",
        zh: "支持",
        ar: "إدعم",
        ru: "Поддержать"
    },
    tryAgain: {
        en: "Try again",
        zh: "再试一次",
        ar: "حاول ثانية",
        ru: "Попробуй еще раз"
    },
    updatedColon: {
        en: "Updated: ",
        zh: "更新日期 ",
        ar: "تم التحديث في: ",
        ru: "Обновлено "
    },
    washingtonDC: {
        en: "Washington, D.C.",
        zh: "华盛顿",
        ar: "واشنطن",
        ru: "Вашингтон"
    }
};
},{}],15:[function(require,module,exports){
/*global module, require, $*/

var config = require('../config')
	, menu = require('../config-menu')
	, notify = require('../../util/notify')
	, access = require('../access')
	, header = require('./header')
	, date = require('../../util/date')
	, storyList = require('./storyList')
	, doesFileExist = require('../../io/doesFileExist')
	, getFileContents = require('../../io/getFileContents')
	, toLocal = require('./getLocalizedString')
	, localStrings = require('./localizedStrings')
	, primary = false;

(function init() {
	var menuFragment = $('<section/>', {
		addClass: 'menu'
	});

	menu.forEach(function (obj) {
		var feed = !!obj.feeds
		, list = $('<ul/>', {
				addClass: 'menu-items'
			})
		, title = $('<span/>', {
				addClass: 'title'
				, text: obj.title || ''
			})
		, sub = $('<span/>', {
				addClass: 'sub'
				, text: obj.sub || ''
			})
		, sectionHeader = $('<div/>', {
				addClass: 'section-header'
			}).append(title).append(sub);

		if (feed) {
			obj.feeds.forEach(function (el) {
				var label = $('<div/>', {
					addClass: 'label'
					, text: el.name
				})
				, sub = $('<div/>', {
					addClass: 'sub'
					, text: toLocal(localStrings.notYetDownloaded)
					, 'data-url': el.filename || el.url.split('/').pop().split('.').shift() + '.json'
				})
				, container = $('<div/>', {
						addClass: 'menu-item-box'
					}).append(label).append(sub)
				, box = $('<div/>', {
						addClass: el.required ? 'check required' : 'check'
					})
				, link = $('<a/>', {
					addClass: 'menu-link feed'
				})
				, hairline = $('<div/>', {
					addClass: 'hairline'
				})
				, item = $('<li/>', {
					addClass: 'menu-item'
				}).append(hairline).append(link.append(container).append(box))
				, filename = access.getFilenameFromFeed(el);

				if (el.required && !primary) {
					primary = item;
					item.addClass('active')
				}
				doesFileExist(filename).then(function () {
					getFileContents(filename).then(function (contents) {
						var obj = (JSON.parse(contents.target._result));
						update(filename, toLocal(localStrings.updatedColon) + date.getFriendlyDate(obj));
						box.addClass('checked');
					}, function (e){console.log(e)});
				}, function (e){console.log(e)});

				list.append(item);
			})
		} else {
			obj.links.forEach(function (el) {
				var label = $('<div/>', {
					addClass: 'label link'
					, text: el.name
				})
				, container = $('<div/>', {
						addClass: 'menu-item-box'
					}).append(label)
				, link = $('<a/>', {
					addClass: 'menu-link link'
					, href: el.url
					, target: '_system'
				})
				, hairline = $('<div/>', {
					addClass: 'hairline'
				})
				, item = $('<li/>', {
					addClass: 'menu-item'
				}).append(hairline).append(link.append(container));

				list.append(item);
			})
		}

		menuFragment.append(sectionHeader).append(list);

	});

	$('section.menu').replaceWith(menuFragment);

	$('a.menu-link .check').on('click', function (e) {
		//download a feed
		var index = $('section.menu li').index($(this).closest('li'));
		e.stopPropagation();

		if ($(this).hasClass('checked') && $(this).hasClass('required') === false) {
			remove(index);
			if (config.track && analytics) {
				analytics.trackEvent('Menu', 'Feed', 'Delete Feed', 10);
			}
		} else {
			if (navigator.connection.type !== 'none') {
				get(index, true, $(this));
				if (config.track && analytics) {
					analytics.trackEvent('Menu', 'Feed', 'Download Feed', 10);
				}
			} else {
				notify.alert(config.connectionMessage);
			}
		}
	});

	$('a.menu-link.feed').on('click', function (e) {
		var $check = $(e.currentTarget).find('.check')
			, index = $('section.menu li').index($(this).closest('li'));
		e.preventDefault();
		if (navigator.connection.type !== 'none' || $check.hasClass('checked') || $check.hasClass('required')) {
			updateHeaderCenterImage (index);
			get(index, false, $(this));
			$('section.menu li.active').removeClass('active');
			$(e.currentTarget).closest('li').addClass('active');
		} else {
			notify.alert(config.connectionMessage);
		}
	});

	$('a.menu-link.link').on('click', function (e) {
		e.preventDefault();
		if (navigator.connection.type !== 'none') {
			var url = $(e.currentTarget).prop('href');
			window.open(encodeURI(url), '_blank', 'location=no,toolbar=yes');
			/*$('section.menu li.active').removeClass('active');
			$(e.currentTarget).closest('li').addClass('active');*/
			if (config.track && analytics) {
				analytics.trackEvent('Menu', 'Link Click ', url, 10);
			}
		} else {
			notify.alert(config.connectionMessage);
		}
	});

}());

function updateHeaderCenterImage (id) {
	var classToAdd = access.getFilenameFromId(id).split(".").shift();
	var classes = access.getFeedsFromConfig();
	var header = $("header");

	if (!header.hasClass(classToAdd)) {
		for (var name in classes) {
			if (classes.hasOwnProperty(name)) {
				header.removeClass(classes[name].filename.split(".").shift());
			}
		}
		if (classToAdd !== "mobile-global") {
			header.addClass(classToAdd);
		}
	}
}

function update(filename, date) {
	var items = $('section.menu .menu-item-box .sub[data-url="' + filename + '"]');
	items.text(date);
	items.closest('li').find('.check').removeClass('loading').addClass('checked');
}

function get(id, loadOnly, $el) {
	var filename = access.getFilenameFromId(id);
	$el.closest('li').find('.check').addClass('loading');

	access.get(id, loadOnly).then(function (contents) {
		var obj = (JSON.parse(contents.target._result));

		update(filename, toLocal(localStrings.updatedColon) + date.getFriendlyDate(obj));
		if (!loadOnly) {
			storyList.show(obj).then(function () {
        header.showStoryList();
			});
		}
	}, function (error) {
		var filename = access.getFilenameFromId(id)
			, item = $('section.menu .menu-item-box .sub[data-url="' + filename + '"]').closest('li');

		analytics.trackEvent('Menu', 'Error', 'Feed Load Error: ' + access.getFilenameFromId(id), 10);
		remove(id);
		notify.alert(getFeedError(toLocal(access.getFeedNameFromId(id)) || access.getFeedNameFromId(id), window.__languageForCarnegie || "en"));
	});
}

function getFeedError (name, language) {
	var error = {
		"ar": name + "ثمة مشكلة في إظهار المحتوى "
		, "ru": "Ошибка загрузки " + name
		, "zh": "加载" + name + "项目出错"
		, "en": 'There was an error processing the ' + name + ' feed'
	};
	return error[language] || error["en"];
}

function cleanup(id) {
	var filename = access.getFilenameFromId(id)
		, item = $('section.menu .menu-item-box .sub[data-url="' + filename + '"]').closest('li');

	item.find('.check').removeClass('checked loading');
	item.find('.sub').text(config.menuMessage);
	if (item.hasClass('active')) {
		item.removeClass('active');
		primary.addClass('active');
		getFileContents(access.getFilenameFromId(0)).then(function (contents) {
			var obj = (JSON.parse(contents.target._result));
			storyList.show(obj);
		})
	}
}

function remove(id) {

	access.removeFeed(id).then(function () {
		cleanup(id)
	}, function () {
		cleanup(id)
	})
}

$(document).on('access.refresh', function (e, obj, filename) {
  update(filename, toLocal(localStrings.updatedColon) + date.getFriendlyDate(obj));
});

module.exports = {
	update: update
};
},{"../../io/doesFileExist":25,"../../io/getFileContents":29,"../../util/date":39,"../../util/notify":41,"../access":1,"../config":8,"../config-menu":6,"./getLocalizedString":12,"./header":13,"./localizedStrings":14,"./storyList":19}],16:[function(require,module,exports){
var access = require('../access');

Hammer.defaults.stop_browser_behavior.touchAction = 'pan-y';

/**
 * requestAnimationFrame and cancel polyfill
 */
(function () {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
                window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                    timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
          clearTimeout(id);
      };
}());


/**
 * pull to refresh
 * @type {*}
 */
var container_el, pullrefresh_el, pullrefresh_icon_el 
	, PullToRefresh = (function() {
    function Main(container, slidebox, slidebox_icon, handler) {
        var self = this;

        this.breakpoint = 80;

        this.container = container;
        this.slidebox = slidebox;
        this.slidebox_icon = slidebox_icon;
        this.handler = handler;

        this._slidedown_height = 0;
        this._anim = null;
        this._dragged_down = false;

        this.hammertime = Hammer(this.container)
            .on("touch dragdown release", function(ev) {
                if ($('.top-bar').eq(0).position().top > -25) {
            		  self.handleHammer(ev);
                }
            });
    }


    /**
     * Handle HammerJS callback
     * @param ev
     */
    Main.prototype.handleHammer = function(ev) {
        var self = this;

        switch(ev.type) {
            // reset element on start
            case 'touch':
                this.hide();
                break;

            // on release we check how far we dragged
            case 'release':
                if(!this._dragged_down) {
                    return;
                }

                // cancel animation
                cancelAnimationFrame(this._anim);

                // over the breakpoint, trigger the callback
                if(ev.gesture.deltaY >= this.breakpoint) {
                    container_el.className = 'pullrefresh-loading';
                    pullrefresh_icon_el.className = 'icon loading';

                    this.setHeight(44);
                    this.handler.call(this);
                }
                // just hide it
                else {
                    pullrefresh_el.className = 'slideup';
                    container_el.className = 'pullrefresh-slideup';

                    this.hide();
                }
                break;

            // when we dragdown
            case 'dragdown':
                // if we are not at the top move down
                var scrollY = window.scrollY;
                if(scrollY > 5) {
                    return;
                } else if(scrollY !== 0) {
                    window.scrollTo(0,0);
                }

                this._dragged_down = true;

                // no requestAnimationFrame instance is running, start one
                if(!this._anim) {
                    this.updateHeight();
                }

                // stop browser scrolling
                ev.gesture.preventDefault();

                // update slidedown height
                // it will be updated when requestAnimationFrame is called
                this._slidedown_height = ev.gesture.deltaY * 0.4;
                break;
        }
    };


    /**
     * when we set the height, we just change the container y
     * @param   {Number}    height
     */
		Main.prototype.setHeight = function(height) {
			if(Modernizr.csstransforms3d) {
				this.container.style.transform = 'translate3d(0,'+height+'px,0) ';
				this.container.style.oTransform = 'translate3d(0,'+height+'px,0)';
				this.container.style.msTransform = 'translate3d(0,'+height+'px,0)';
				this.container.style.mozTransform = 'translate3d(0,'+height+'px,0)';
				this.container.style.webkitTransform = 'translate3d(0,'+height+'px,0) scale3d(1,1,1)';
			} else if(Modernizr.csstransforms) {
				this.container.style.transform = 'translate(0,'+height+'px) ';
				this.container.style.oTransform = 'translate(0,'+height+'px)';
				this.container.style.msTransform = 'translate(0,'+height+'px)';
				this.container.style.mozTransform = 'translate(0,'+height+'px)';
				this.container.style.webkitTransform = 'translate(0,'+height+'px)';
			} else {
				this.container.style.top = height+"px";
			}
		};

		/**
     * hide the pullrefresh message and reset the vars
     */
    Main.prototype.hide = function() {
        container_el.className = '';
        this._slidedown_height = 0;
        this.setHeight(0);
        cancelAnimationFrame(this._anim);
        this._anim = null;
        this._dragged_down = false;
    };


    /**
     * hide the pullrefresh message and reset the vars
     */
    Main.prototype.slideUp = function() {
        var self = this;
        cancelAnimationFrame(this._anim);

        pullrefresh_el.className = 'slideup';
        container_el.className = 'pullrefresh-slideup';

        this.setHeight(0);

        setTimeout(function() {
            self.hide();
        }, 500);
    };


    /**
     * update the height of the slidedown message
     */
    Main.prototype.updateHeight = function() {
        var self = this;

        this.setHeight(this._slidedown_height);

        if(this._slidedown_height >= this.breakpoint){
            this.slidebox.className = 'breakpoint';
            this.slidebox_icon.className = 'icon arrow arrow-up';
        }
        else {
            this.slidebox.className = '';
            this.slidebox_icon.className = 'icon arrow';
        }

        this._anim = requestAnimationFrame(function() {
            self.updateHeight();
        });
    };

    return Main;
})();

function getEl(id) {
    return document.getElementById(id);
}

function init() {

	container_el = getEl('story-list-container');
	pullrefresh_el = getEl('pullrefresh');
	pullrefresh_icon_el = getEl('pullrefresh-icon');

	var refresh = new PullToRefresh(container_el, pullrefresh_el, pullrefresh_icon_el);

	refresh.handler = function() {
        var self = this;
        access.refresh().then(function () {
            self.slideUp();
        }, function () {
            self.slideUp();
        });
	};
}

module.exports = {
	init: init
}


},{"../access":1}],17:[function(require,module,exports){
module.exports = (function () {
  var win = $(window)
    , w = win.width()
    , h = win.height();

  if (parseInt(Math.min(w, h), 10) >= 550) {
	  $('body').addClass('tablet');
  }
}());
},{}],18:[function(require,module,exports){
/*global module, require, $*/

var config = require('../config')
	, access = require('../access')
	, notify = require('../../util/notify')
    , date = require("../../util/date")
	, share = ['ios', 'android', 'win32nt'].indexOf(device.platform.toLowerCase()) > -1
	, browser = ['ios', 'android', 'blackberry 10', 'win32nt'].indexOf(device.platform.toLowerCase()) > -1
	, $story = $('section.story')
	, slider = document.getElementById('text-resize-input')
	, feedObj
	, index;

if (share && plugins && plugins.socialsharing) {
  $(document)
		.on('touchstart', 'footer.story-footer .share', function (e) {
			$(e.currentTarget).addClass('active');
		})
		.on('touchend', 'footer.story-footer .share', function (e) {
			var ui = $(e.currentTarget);
			if ($(e.currentTarget).hasClass('disabled') === false) {
				setTimeout(function () {
					hideTextResize();
					if (typeof index !== 'undefined' && feedObj && navigator.connection.type !== 'none') {
						window.plugins.socialsharing.share(
								'I\'m currently reading ' + (feedObj.story ? feedObj.story[index].title : feedObj.item[index].title),
							(feedObj.story ? feedObj.story[index].title : feedObj.item[index].title),
								(feedObj.story ? (feedObj.story[index].image) : (feedObj.item[index].image)) || config.missingImage,
							encodeURI(feedObj.story ? feedObj.story[index].link : feedObj.item[index].link)
						);
						if (config.track && analytics) {
							analytics.trackEvent('Story', 'Share', 'Share Clicked', 10);
						}
					} else {
						if (navigator.connection.type === 'none') {
							notify.alert(config.connectionMessage);
						} else {
							notify.alert('Sorry, a problem occurred while trying to share this post')
						}
					}
					ui.removeClass('active');
				}, 0)
			} else {
				ui.removeClass('active');
			}
		})
} else {
  //remove footer & make story window taller, sharing not supported
  $('footer.story-footer button.share').addClass('disabled');
}

if (browser) {
  $(document).on('click', 'section.story .current a', function (e) {
    var href = $(e.currentTarget).attr('href');

    if (href.substr(0, 1) === '#') {
      if ($('.current').find(href)) {
        if (config.track && analytics) {
          analytics.trackEvent('Story', 'Link', 'Page Anchor Clicked', 10);
        }
	      e.preventDefault()
	      $('.current').scrollTop($(href).position().top);
      } else {
        e.preventDefault();
        return false;
      }
    } else if (navigator.connection.type !== 'none') {
      e.preventDefault();
      if (href.substr(0, 6) === 'mailto') {
        window.open(encodeURI(href), '_system', '');
        if (config.track && analytics) {
          analytics.trackEvent('Story', 'Link', 'Email Link Clicked', 10);
        }
      } else {
        window.open(encodeURI(href), '_blank', 'location=no,toolbar=yes,enableViewportScale=yes');
        if (config.track && analytics) {
          analytics.trackEvent('Story', 'Link', 'External Link Clicked', 10);
        }
      }
    } else {
      e.preventDefault();
      notify.alert(config.connectionMessage);
    }
  })
} else {
  // handle systems with no inapp browser, or don't...
}

$(document)
	.on('touchstart', 'footer.story-footer .text', function (e) {
		$(e.currentTarget).addClass('active');
	})
	.on('touchend', 'footer.story-footer .text', function (e) {
		var ui = $(e.currentTarget);
		setTimeout(function () {
			$('.text-resize').toggleClass('active');
			if (config.track && analytics) {
				analytics.trackEvent('Story', 'UI', 'Text Resize Opened', 10);
			}
			ui.removeClass('active');
		}, 0)
	});

function hideTextResize() {
  $('.text-resize').removeClass('active');
}

slider.onchange = function () {
  setTimeout(function () {
    var val = parseFloat(slider.value)
      , value = (slider.value - slider.min) / (slider.max - slider.min);

    config.storyFontSize = val;

    slider.style.backgroundImage = [
      '-webkit-gradient(',
      'linear, ',
      'left top, ',
      'right top, ',
        'color-stop(' + value + ', #007aff), ',
        'color-stop(' + value + ', #b8b7b8)',
      ')'
    ].join('');
    $story.css('font-size', val + 'em');
  }, 0)
};

function show(i, feed) {
  return new Promise(function (resolve, reject) {
    var obj = feedObj = feed || feedObj
      , storyObj = obj.story ? obj.story[i] : obj.item[i]
      , rtl = /[\u0600-\u06FF\u0750-\u077F]/.test(feedObj.title) || feedObj.title.toLowerCase().indexOf('arabic') > -1
      , current = $('<div/>', {
        addClass: 'current'
      });

    index = i;
    $('section.story').toggleClass('rtl', !!rtl).prop('dir', rtl ? 'rtl' : 'ltr');

    if (config.track && analytics) {
      track(obj.story ? obj.story[i].title : obj.item[i].title);
    }

    createPage(storyObj).then(function (page) {
      current.append(page);
      $('section.story .current').replaceWith(current);

      createPreviousAndNext();

      setTimeout(function () {
        resolve(200)
      }, 0)
    }, reject)
  })
}

function createPrevious() {
  var previous = $('<div/>', {
      addClass: 'previous'
    })
    , $previous = $('section.story .previous');

  if (notFirst()) {
    createPage(feedObj.story ? feedObj.story[index - 1] : feedObj.item[index - 1]).then(function (pageP) {
      previous.append(pageP);
      if ($previous.length) {
        $previous.replaceWith(previous);
      } else {
        $('section.story').append(previous);
      }
    })
  } else {
    $previous.empty()
  }
}

function createNext() {
  var next = $('<div/>', {
      addClass: 'next'
    })
    , $next = $('section.story .next');

  if (notLast()) {
    createPage(feedObj.story ? feedObj.story[index + 1] : feedObj.item[index + 1]).then(function (pageN) {
      next.append(pageN);
      if ($next.length) {
        $next.replaceWith(next);
      } else {
        $('section.story').append(next);
      }
    })
  } else {
    $next.empty()
  }
}

function createPreviousAndNext() {
  createPrevious();
  createNext();
}

function createPage(storyObj) {
  return new Promise(function (resolve, reject) {
    var fs = config.fs.toURL()
      , path = fs + (fs.substr(-1) === '/' ? '' : '/')
      , image = storyObj.image ? path + storyObj.image.split('/').pop() : config.missingImageRef.toURL()
        , feedConfig = access.getFeedsFromConfig()[access.getCurrentId()]
      , topBar = $('<div/>', {
        addClass: 'top-bar', html: storyObj.docType || ''
      })
      , storyTitle = $('<div/>', {
        addClass: 'story-title', text: storyObj.title
      })
      , storyImage = $('<img>', {
        src: image, addClass: 'story-image'
      })
      , storyAuthor = $('<div/>', {
        addClass: 'story-author', text: storyObj.author || ''
      })
      , storyDate = $('<div/>', {
        addClass: 'story-date', text: date.getStoryDate(storyObj, feedConfig.language)
      })
      , storyMeta = $('<div/>', {
        addClass: 'story-meta'
      }).append(storyTitle).append(storyAuthor).append(storyDate)
      , storyTop = $('<div/>', {
        addClass: 'story-top'
      }).append(storyImage).append(storyMeta)
      , storyText = $('<div/>', {
        addClass: 'story-text', html: storyObj.description
      })
      , page = $('<div/>', {
        addClass: 'page'
      }).append(topBar).append(storyTop).append(storyText);

    storyImage.on('error', function (e) {
      $(this).prop('src', config.missingImageRef.toURL());
    });

    setTimeout(function () {
      resolve(page)
    }, 0)
  })
}

function notLast(id) {
  var length = feedObj.story ? feedObj.story.length : feedObj.item.length;
  return id || index < length - 1;
}

function notFirst(id) {
  return id || index > 0;
}

function next() {
  if (notLast()) {
    index += 1;
    var c = $('section.story .current')
      , n = $('section.story .next');

    $('section.story .previous').remove();
    c.removeClass('current').addClass('previous');
    n.removeClass('next').addClass('current');
    update();
    createNext();
    track(feedObj.story ? feedObj.story[index].title : feedObj.item[index].title);
  }
}

function track(title) {
  if (config.track && analytics) {
    analytics.trackEvent('Story', 'Load', title, 10);
  }
}

function previous() {
  if (notFirst()) {
    index -= 1;
    var c = $('section.story .current')
      , p = $('section.story .previous');

    $('section.story .next').remove();
    c.removeClass('current').addClass('next');
    p.removeClass('previous').addClass('current');
    update();
    createPrevious();
    track(feedObj.story ? feedObj.story[index].title : feedObj.item[index].title);
  }
}

function update() {
  hideTextResize();
  $('section.story-list ul li .story-item.active').removeClass('active');
  $('section.story-list ul li .story-item').eq(index).addClass('active');

  setTimeout(function () {
    $('section.story .next').scrollTop(0);
    $('section.story .previous').scrollTop(0);
      if (index === 0) {
          $('.story-list').scrollTop(0)
      } else {
          $('.story-list').scrollTop(
              parseInt($('.story-list ul li').eq(0).height(), 10) +
              ((index - 1) * parseInt($('.story-list ul li').eq(1).height(), 10))
          )
      }
  }, 350)
}

function showAndUpdate(index) {
  show(index, null, true).then(function () {
    update();
  });
}

module.exports = {
  show: show, next: next, previous: previous, hide: hideTextResize
};
},{"../../util/date":39,"../../util/notify":41,"../access":1,"../config":8}],19:[function(require,module,exports){
/*global require, module, $*/
var config = require('../config')
    , access = require('../access')
  , connection = require('../../util/connection')
  , header = require('./header')
  , notify = require('../../util/notify')
    , date = require('../../util/date')
  , story = require('./story')
  , refresh = require('./refresh')
    , toLocal = require('./getLocalizedString')
    , localStrings = require('./localizedStrings')
	, android = device.platform.toLowerCase() === 'android'
	, version = device.version.split('.')
	// allow iOS devices and Android devices 4.4 and up to have pull to refresh
	, allowRefresh = !android || (parseInt(version[0], 10) > 4) || ((parseInt(version[0], 10) === 4) && (parseInt(version[1], 10) >= 4));

function show(feedObj, forceActive) {
	return new Promise(function(resolve, reject) {
    var obj = feedObj.story ? feedObj.story : feedObj.item
      , rtl = /[\u0600-\u06FF\u0750-\u077F]/.test(feedObj.title) || feedObj.title.toLowerCase().indexOf('arabic') > -1
      , fs = config.fs.toURL()
      , path = fs + (fs.substr(-1) === '/' ? '' : '/')
        , feedConfig = access.getFeedsFromConfig()[access.getCurrentId()]
      , pullTop = $('<div/>', {
        id: 'pullrefresh-icon'
      })
      , message = $('<div/>', {
        addClass: 'message'
        , text: ''
      }).append(pullTop)
      , pull = $('<div/>', {
        id: 'pullrefresh'
      }).append(message)
      , topBar = $('<div/>', {
        addClass: 'top-bar'
        , text: toLocal(localStrings.updatedColon, feedConfig.language) + date.getFriendlyDate(feedObj, feedConfig.language)
      })
      , ul = $('<ul/>', {})
      , container = $('<div/>', {
        id: 'story-list-container'
      }).append(topBar).append(pull).append(ul)
      , section = $('<section/>', {
        addClass: 'story-list' + (!!forceActive ? ' active' : '')
        , dir: rtl ? 'rtl' : 'ltr'
      }).append(container).toggleClass('rtl', rtl)
      , sent = false;

    obj.forEach(function (element) {
      var image = element.image ? path + element.image.split('/').pop() : config.missingImageRef.toURL()
        , storyTitle = $('<div/>', {
          addClass: 'story-title'
          , text: element.title
        })
        , storyAuthor = $('<div/>', {
          addClass: 'story-author'
          , text: element.author
        })
        , storyDate = $('<div/>', {
          addClass: 'story-date'
          , text: date.getStoryDate(element, feedConfig.language)
        })
        , storyText = $('<div/>', {
          addClass: 'story-text'
        }).append(storyTitle).append(storyAuthor).append(storyDate)
        , storyImage = $('<img>', {
          src: image
          , addClass: 'story-image'
        })
        , hairline = $('<div/>', {
          addClass: 'hairline'
        })
        , storyItem = $('<div/>', {
          addClass: 'story-item'
        }).append(hairline).append(storyImage).append(storyText)
        , li = $('<li/>', {}).append(storyItem);

        ul.append(li);
    });

    $('.container section.story-list').replaceWith(section);

		/*$('#story-list-container').on('touchmove touchend', function () {
			var pos = parseInt($('#story-list-container').offset().top, 10);
			var lastLi = $('#story-list-container').find('ul').find('li').last();
			var fLi = $('#story-list-container').find('ul').find('li').first();
			if (pos <= -500) {
				$('#story-list-container').offset({top:lastLi.offset().top})
			} else if (pos > 44) {
				$('#story-list-container').offset({top:fLi.offset().top})
			}
		});*/

    $('.story-item').on('click', function (e) {
        if (e.clientY > (parseInt($('header').height()) + 5)) {
            if (connection.get() === 'none') {
                $('body').addClass('offline')
            } else {
                $('body').removeClass('offline')
            }
            var li = $(this).closest('li')
                , index = $('section.story-list ul li').index(li)
                , feed = sent ? void 0 : feedObj;

            $('.story-item.active').removeClass('active');
            $(this).addClass('active');
            story.show(index, feed).then(function () {
                header.showStory();
            });
            sent = true;
        }
    });

    $('.story-image').on('error', function (e) {
      $(this).prop('src', config.missingImageRef.toURL());
    });
    setTimeout(function () {
			if (allowRefresh) {
				refresh.init();
			}
      resolve(200);
    }, 0);

    if (config.track && analytics) {
      analytics.trackEvent('Feed', 'Load', feedObj.title, 10);
    }

  })
}

$(document).on('access.refresh', function (e, obj) {
  show(obj, true);
});

module.exports = {
	show: show
};
},{"../../util/connection":38,"../../util/date":39,"../../util/notify":41,"../access":1,"../config":8,"./getLocalizedString":12,"./header":13,"./localizedStrings":14,"./refresh":16,"./story":18}],20:[function(require,module,exports){
/*global module, require*/
module.exports = function (res) {
	var feedObject = {item:[]}
    , root = res.firstChild.firstChild
    , numberOfNodes = root.childNodes.length
    , items = []
    , i
    , j;

  for (i = 0; i < numberOfNodes; i += 1) {
    switch (root.childNodes[i].nodeName) {
      case 'item' :
        items.push(root.childNodes[i]);
        break;
      default :
        feedObject[root.childNodes[i].nodeName] = root.childNodes[i].textContent;
        break;
    }
  }

  for (i = 0; i < items.length; i += 1) {
    feedObject.item[i] = {};
    for (j = 0; j < items[i].childNodes.length; j += 1) {
      feedObject.item[i][items[i].childNodes[j].nodeName] = items[i].childNodes[j].textContent;
    }
  }

  return feedObject;
};
},{}],21:[function(require,module,exports){
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var analyticsConfig = require('./app/analyticsConfig');

module.exports = (function () {
		document.addEventListener('deviceready', appReady, false);

		function appReady() {
			// this setTimeout is to allow a developer six seconds
			// to connect a debugger before the app initializes
			// should be commented out for release, but uncomment appInit()
			//setTimeout(function () {
				appInit();
			//}, 6000)
		}

		function startApp () {
			require('./app/history');
			require('./init');
		}

		function getCountryCodeFromSim () {
			window.plugins.carrier.getCarrierInfo(
				function (data) {
					var testing = false;
					if (testing) {
						window.__localCenter = "moscow"
					} else
					// only use SIM-based country lookup when no previous laguage override exists (English)
					if (window.__languageForCarnegie === undefined && data && data["countryCode"] !== undefined) {
						var cc = data["countryCode"];
						var countries = {
							moscow: ["RU", "UA", "BY", "MD", "AZ", "GE", "EE", "LV", "LT"],
							beijing: ["CN", "HK", "MO", "SG", "TW", "JP", "KP", "KR", "MM", "LA", "TH", "KH", "VN", "MY", "PH", "ID"],
							beirut: ["BH", "IR", "IQ", "IL", "JO", "LB", "PS", "SA", "SY", "TR", "AE", "YE", "DZ", "EG", "LY", "MR", "MA", "SD", "TN", "ML"],
							brussels: ["FR", "DE", "GB", "IE", "ES", "PT", "BE", "NL", "DK", "NO", "SE", "FI", "PL", "CZ", "AT", "IT", "HU", "GR", "SK"],
							newDelhi: ["IN", "PK", "AF", "BD", "NP", "LK"]
						};
						for (var key in countries) {
							if (countries.hasOwnProperty(key)) {
								if (countries[key].indexOf(cc) > -1) {
									window.__localCenter = key
								}
							}
						}
					}
					analytics.trackEvent('Country Code', 'Load', data && data['countryCode'] || "undefined", 10);
					startApp()
				}, function () {
					analytics.trackEvent('Country Code', 'Fail', "No country code detected from SIM", 10);
					startApp()
				}
			);
		}

		function appInit () {
			$(function () {
				if (analyticsConfig.track && analytics) {
					analytics.startTrackerWithId(analyticsConfig.trackId);
					analytics.trackEvent('Init', 'Load', 'App Started', 10);
				}

				navigator.globalization.getPreferredLanguage(
					function (language) {
						var body = $(window.document.body);
						analytics.trackEvent('Language', 'Load', language.value, 10);
						if (language && language.value) {
							if (language.value.indexOf("ar") > -1) {
								window.__languageForCarnegie = "ar";
								body.addClass('arabic-ui');
							} else if (language.value.indexOf("ru") > -1) {
								window.__languageForCarnegie = "ru";
								body.addClass('russian-ui');
							} else if (language.value.indexOf("zh") > -1) {
								window.__languageForCarnegie = "zh";
								body.addClass('chinese-ui');
							}
						}
						getCountryCodeFromSim();
					},
					function () {
						alert("no language");
						analytics.trackEvent('Language', 'Fail', "No preferred language detected", 10);
						getCountryCodeFromSim();
					}
				);
			});
		}
}());

},{"./app/analyticsConfig":2,"./app/history":10,"./init":22}],22:[function(require,module,exports){
/*global module, require, $*/
module.exports = (function () {
	var access = require('./app/access')
		, responsive = require('./app/ui/responsive')
		, connection = require('./util/connection')
		, date = require('./util/date')
		, createDir = require('./io/createDir')
		, storyList = require('./app/ui/storyList')
		, notify = require('./util/notify')
		, header = require('./app/ui/header')
		, doesFileExist = require('./io/doesFileExist')
		, downloadMissingImage = require('./app/downloadMissingImage')
		, err = require('./util/err')
		, toLocal = require('./app/ui/getLocalizedString')
		, localStrings = require('./app/ui/localizedStrings')
		, platform = device.platform.toLowerCase()
		, android = device.platform.toLowerCase() === 'android'
		, version = device.version.split('.')
		, legacy = android && parseInt(version[1], 10) < 4
		, timeout = 500
		, menu;

	document.addEventListener('online', connection.online, false);
	document.addEventListener('offline', connection.offline, false);

	$('body').addClass(platform);
	if (platform.indexOf('amazon') > -1) {
		$('body').addClass('android');
	}
	if (legacy) {
		$('body').addClass('legacy');
	}

	header.setBackLabelText(toLocal(localStrings.back));

	function getFeed() {
		var defaultFeedID = getDefaultFeedID();
		access.get(defaultFeedID).then(function (contents) {
			var obj = (JSON.parse(contents.target._result))
				, filename = access.getFilenameFromId(defaultFeedID);

			menu.update(filename, toLocal(localStrings.updatedColon) + date.getFriendlyDate(obj));
			storyList.show(obj).then(function () {
				header.showStoryList();

				setTimeout(function () {
					navigator.splashscreen.hide();
				}, timeout)
			})
		}, function () {
			var message = toLocal(localStrings.processingErrorMessage);
			var cancel = toLocal(localStrings.cancel);
			var tryAgain = toLocal(localStrings.tryAgain);
			analytics.trackEvent('Load', 'Error', 'JSON Parse Error', 10);
			notify.confirm(message, getFeed, null, [tryAgain, cancel]);
		});
	}

	createDir().then(function () {
		downloadMissingImage().then(function () {
			menu = require('./app/ui/menu');
			getFeed();
		}, err)
	}, err);


	function getDefaultFeedID () {
		var feedsArray = access.getFeedsFromConfig();
		for (var i = 0; i < feedsArray.length; i += 1) {
			if (feedsArray[i] && feedsArray[i].required) {
				return i;
			}
		}
		return 0;
	}
}());
},{"./app/access":1,"./app/downloadMissingImage":9,"./app/ui/getLocalizedString":12,"./app/ui/header":13,"./app/ui/localizedStrings":14,"./app/ui/menu":15,"./app/ui/responsive":17,"./app/ui/storyList":19,"./io/createDir":23,"./io/doesFileExist":25,"./util/connection":38,"./util/date":39,"./util/err":40,"./util/notify":41}],23:[function(require,module,exports){
var getFileSystem = require('./getFileSystem')
	, getFile = require('./getFile')
	, makeDir = require('./makeDir')
	, notify = require('../util/notify')
	, config = require('../app/config');

module.exports = function () {
	var dirname = config.folder;
	return new Promise(function (resolve, reject) {
		getFileSystem().then(function (filesystem) {
			makeDir(filesystem, dirname).then(function (response) {
				config.fs = response;
				resolve(response)
			}, reject);
		}, reject);
	})
};
},{"../app/config":8,"../util/notify":41,"./getFile":28,"./getFileSystem":32,"./makeDir":33}],24:[function(require,module,exports){
/*global module, require*/
var getFileSystem = require('./getFileSystem')
	, getFile = require('./getFile')
	, getFileEntry = require('./getFileEntry')
	, writeFile = require('./writeFile');

module.exports = function (filename, contents) {
	return new Promise(function (resolve, reject) {

		// full set of Crockford's problem characters https://github.com/douglascrockford/JSON-js/blob/master/json2.js
		//[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff
		var reg = /[\u000a\u000d\u2028\u2029]/g; // known problem characters, line terminators
		contents = contents.replace(reg, '');

		try {
			JSON.parse(contents);
		} catch (e) {
			if (void 0 !== window.analytics) {
				analytics.trackEvent('Feed', 'Error', 'JSON Parse Error: ' + filename, 10);
			}
			reject()
		}

		getFileSystem().then(function (filesystem) {
			getFile(filesystem, filename, true).then(function (fileentry) {  
				getFileEntry(fileentry).then(function (filewriter) {
					writeFile(filewriter, contents).then(resolve, reject);
				}, reject);
			}, reject);
		}, reject);
	})
};
},{"./getFile":28,"./getFileEntry":30,"./getFileSystem":32,"./writeFile":37}],25:[function(require,module,exports){
var getFileSystem = require('./getFileSystem')
	, getFile = require('./getFile');

module.exports = function (filename) {
	return new Promise(function (resolve, reject) {
		getFileSystem().then(function (filesystem) {
			getFile(filesystem, filename).then(resolve, reject);
		}, reject)
	})
}
},{"./getFile":28,"./getFileSystem":32}],26:[function(require,module,exports){
var config = require('../app/config')
	, getFileSystem = require('./getFileSystem')
	, getFile = require('./getFile')
	, downloadFile = require('./downloadFile');

module.exports = function (url) {
	var filename = url.split('/').pop();
	return new Promise(function (resolve, reject) {
		getFile(config.fs, filename, false).then(resolve,
			function () {
				getFile(config.fs, filename, true).then(function (fileentry) {  
					downloadFile(fileentry, url).then(resolve, reject);
			}, reject);
		}) 
	})
}
},{"../app/config":8,"./downloadFile":27,"./getFile":28,"./getFileSystem":32}],27:[function(require,module,exports){
var config = require('../app/config');

module.exports = function (fileentry, url) {
  var fileTransfer = new FileTransfer()
  , uri = encodeURI(url)
  , path = fileentry.toURL();

  return new Promise(function (resolve, reject) {
	  function catchErrors(reason) {
	  	if ((reason.http_status === 404) || (reason.http_status === 410)) {
				resolve(config.missingFileRef)
			} else {
				reject(reason);
			}
	  }

    fileTransfer.download(uri, path, resolve, catchErrors, false, {})
  });
};
},{"../app/config":8}],28:[function(require,module,exports){
var config = require('../app/config');

module.exports = function (filesystem, filename, create) {
	var fs = config.fs || filesystem;
	return new Promise(function (resolve, reject) {
		fs.getFile(filename, {create: !!create, exclusive: false}, resolve, reject);
	});
}
},{"../app/config":8}],29:[function(require,module,exports){
var getFileSystem = require('./getFileSystem')
  , getFile = require('./getFile')
  , readFile = require('./readFile');

module.exports = function (filename) {
  return new Promise(function (resolve, reject) {
    getFileSystem().then(function (filesystem) {
      getFile(filesystem, filename).then(function (fileentry) {
        readFile(fileentry).then(resolve, reject);
      }, reject);
    }, reject);
  })
}
},{"./getFile":28,"./getFileSystem":32,"./readFile":35}],30:[function(require,module,exports){
module.exports = function (fileentry) {
	return new Promise(function (resolve, reject) {
		fileentry.createWriter(resolve, reject);
	})
};
},{}],31:[function(require,module,exports){
var getFileSystem = require('./getFileSystem')
  , readDirectory = require('./readDirectory');

module.exports = function (filename) {
  return new Promise(function (resolve, reject) {
    getFileSystem().then(function (filesystem) {
      readDirectory(filesystem).then(resolve, reject);
    }, reject);
  })
}
},{"./getFileSystem":32,"./readDirectory":34}],32:[function(require,module,exports){
module.exports = function () {
	return new Promise(function (resolve, reject) {
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, resolve, reject)
	})
};
},{}],33:[function(require,module,exports){
var config = require('../app/config');

module.exports = function (filesystem, dirname) {
	return new Promise(function (resolve, reject) {
		var fileentry = filesystem.root;
		fileentry.getDirectory(dirname, {create: true, exclusive: false}, resolve, reject);
	});
}
},{"../app/config":8}],34:[function(require,module,exports){
var config = require('../app/config');

module.exports = function (filesystem) {
	var fs = config.fs || filesystem.root
		, reader = fs.createReader();
		
	return new Promise(function (resolve, reject) {
		reader.readEntries(resolve, reject);
	});
}
},{"../app/config":8}],35:[function(require,module,exports){
/*global module, require*/
var removeFile = require('./removeFile');

module.exports = function (fileentry) {
	var reader = new FileReader()
		, errorHandler = window.onerror
		, restoreHandler = function () {
			window.onerror = errorHandler;
		};

	return new Promise(function (resolve, reject) {
		var rejection = function (err) {
			restoreHandler();
			reject(err);
		};
		window.onerror = function (err) {
			removeFile(fileentry).then(rejection, rejection)
		};
		fileentry.file(function (f) {
			reader.onloadend = function (s) {
				restoreHandler();
				resolve(s);
			};
			reader.onerror = rejection;
			reader.readAsText(f);
		})
	});
};
},{"./removeFile":36}],36:[function(require,module,exports){
module.exports = function (fileentry) {
    return new Promise(function (resolve, reject) {
        fileentry.remove(resolve, reject)
    });
};
},{}],37:[function(require,module,exports){
module.exports = function (filewriter, contents) {
  return new Promise(function (resolve, reject) {
    filewriter.onwriteend = resolve;
  	filewriter.onerror = reject;
    filewriter.write(contents);
  });
}


},{}],38:[function(require,module,exports){
/*global require, module, $*/
var notify = require('./notify')
	, config = require('../app/config');

function get() {
	return navigator.connection.type;
}

function online(e) {
	$('header .menu .offline').fadeOut();
}

function offline(e) {
	$('header .menu .offline').fadeIn();
}

$('header .menu .offline').on('click', function () {
	notify.alert(config.connectionMessage);
});

module.exports = {
	online: online
	, offline: offline
	, get: get
};
},{"../app/config":8,"./notify":41}],39:[function(require,module,exports){

function getLocalDate (options) {
    var year = options.year;
    var month = options.month;
    var date = options.date;

    if (year !== undefined && month !== undefined && date !== undefined) {
        if (options.language !== undefined) {
            if (options.language === "ar") {
                return getArabicDate(options)
            } else if (options.language === "zh") {
                return getChineseDate(options);
            } else if (options.language === "ru") {
                return getRussianDate(options);
            } else if (options.language === "en") {
                return void 0;
            }
        }

        if (window.__languageForCarnegie === "ar") {
            return getArabicDate(options);
        } else if (window.__languageForCarnegie === "zh") {
            return getChineseDate(options);
        } else if (window.__languageForCarnegie === "ru") {
            return getRussianDate(options);
        }
    }
    return void 0;
}

function getArabicDate (options) {
    var year = options.year;
    var month = options.month;
    var date = options.date;
    return "" + date + " " + month + " " + year;
}

function getChineseDate (options) {
    var year = options.year;
    var month = options.month;
    var date = options.date;
    return "" + year + "年" + months["zh"][month] + date + "日";
}

function getRussianDate (options) {
    var year = options.year;
    var month = options.month;
    var date = options.date;
    return "" + date + " " + months["ru"][month] + " " + year;
}

function getStoryDate (obj, language) {
    if (obj.pubDate !== undefined) {
        var localDate;
        if (language !== undefined) {
            localDate = getStandardDateFromPubDate(obj.pubDate, language);
        } else {
            localDate = getStandardDateFromPubDate(obj.pubDate);
        }
        if (localDate !== undefined) {
            return localDate;
        }
    }
    return obj.publishDate || obj.pubDate;
}

function getFriendlyDate (obj, language) {
    if (obj.lastBuildDate !== undefined) {
        var localDate;
        if (language !== undefined) {
            localDate = getStandardDateFromPubDate(obj.lastBuildDate, language);
        } else {
            localDate = getStandardDateFromPubDate(obj.lastBuildDate);
        }
        if (localDate !== undefined) {
            return localDate;
        }
    }
    return obj.friendlyPubDate !== undefined ? obj.friendlyPubDate : obj.lastBuildDate;
}

module.exports = {
    getStandardDateFromPubDate: getStandardDateFromPubDate
    , getFriendlyDate: getFriendlyDate
    , getStoryDate: getStoryDate
};


function getStandardDateFromPubDate (pubDate, language) {
    //var sample = "Fri, Apr 15 2016 8:58 AM EST";
    if (pubDate !== undefined && pubDate.split !== undefined) {
        var parts = pubDate.split(" ");
        //alert(pubDate);
        if (parts.length >= 5) {
            var first = monthToInt(parts[1]) || parseInt(parts[1], 10);
            var second = monthToInt(parts[2]) || parseInt(parts[2], 10);
            var year = parseInt(parts[3], 10);
            var hour = standardHour(parts[4], parts[5]);
            var minute = parts[4].split(":").pop();
            var month = parts[1].length > parts[2].length ? first : second;
            var date = parts[1].length > parts[2].length ? second : first;
            //alert("" + month + " " + date + " " + year + " " + hour + " " + minute);
            //return new Date(Date.UTC(year, month, date, hour, minute));
            return getLocalDate({year: year, month: month, date: date, language: language});
        }
    }
    return void 0;
};

var months = {
    ru: ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
    zh: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    ar: ["كانون الثاني/يناير","شباط/فبراير","آذار/مارس","نيسان/أبريل","أيار/مايو","حزيران/يونيو","تموز/يوليو","آب/أغسطس","أيلول/سبتمبر","تشرين الأول/أكتوبر","تشرين الأول/نوفمبر","كانون الأول/ديسمبر"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};

var days = {
    ru: ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],
    zh: ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"],
    ar: ["الأحد","الاثنين","الثلثاء","الأربعاء","الخميس","الجمعة","السبت"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};

function monthToInt(month) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (var i = 0; i < months.length; i += 1) {
        if (month.indexOf(months[i]) > -1) {
            return i
        }
    }
    return void 0;
}

function standardHour (time, ampm) {
    if (time !== undefined && ampm !== undefined) {
        var hourInt = parseInt(time, 10);
        var hour = ampm.toUpperCase() === "AM" ? hourInt : (hourInt + 12);
        if (hour !== undefined && hour >= 0 && hour <= 23) {
            return hour
        }
    }
    return void 0;
}
},{}],40:[function(require,module,exports){
module.exports = function (reason) {
	console.log(reason);
};
},{}],41:[function(require,module,exports){
var config = require('../app/config')
	, toLocal = require('../app/ui/getLocalizedString')
	, localStrings = require('../app/ui/localizedStrings');

function alert(message, callback, title, buttonLabel) {
	var ok = toLocal(localStrings.ok) || "OK";
	navigator.notification.alert(message, callback, title || config.appName, buttonLabel || ok);
}

function confirm(message, callback, title, buttonLabels) {
	//title: defaults to 'Confirm'
	//buttonLabels: defaults to [OK, Cancel]
	var ok = toLocal(localStrings.ok) || "OK";
	var cancel = toLocal(localStrings.cancel) || "Cancel";
	var defaults = [ok, cancel];
	navigator.notification.confirm(message, callback, title || config.appName, buttonLabels || defaults);
}

function y(message) {
	alert(message || 'Yes', $.noop, 'W1N', 'MOAR!!!')
}

function n(message) {
	alert(message || 'No', $.noop, 'FA1L', 'Try again!')
}

module.exports = {
	alert: alert,
	confirm: confirm,
	y: y,
	n: n
};
},{"../app/config":8,"../app/ui/getLocalizedString":12,"../app/ui/localizedStrings":14}]},{},[21]);
