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
