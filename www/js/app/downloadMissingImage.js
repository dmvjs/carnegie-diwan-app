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