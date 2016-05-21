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
			require('./init');
		}

		function getCountryCodeFromSim () {
			debugger;
			window.plugins.carrier.getCarrierInfo(
				function (data) {
					//alert(data['carrierName']);
					//alert(data['countryCode']);
					//alert(data['mcc']);
					//alert(data['mnc']);
					analytics.trackEvent('Country Code', 'Load', data['countryCode'], 10);
					startApp()
				}, function () {
					//alert('Error!');
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
