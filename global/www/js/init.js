/*global module, require, $*/
module.exports = (function () {
	var access = require('./app/access')
		, responsive = require('./app/ui/responsive')
		, connection = require('./util/connection')
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

	function getFeed() {
		var defaultFeedID = getDefaultFeedID();
		access.get(defaultFeedID).then(function (contents) {
			var obj = (JSON.parse(contents.target._result))
				, filename = access.getFilenameFromId(defaultFeedID)
				, date = obj.friendlyPubDate || obj.lastBuildDate;

			menu.update(filename, toLocal(localStrings.updatedColon) + date);
			storyList.show(obj).then(function () {
				header.showStoryList();

				setTimeout(function () {
					navigator.splashscreen.hide();
				}, timeout)
			})
		}, function () {
			analytics.trackEvent('Load', 'Error', 'JSON Parse Error', 10);
			notify.confirm('There was an error processing the feed data. Try again in a few minutes.', getFeed, null, ['Try again', 'Cancel']);
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