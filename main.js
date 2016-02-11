(function() {
	'use strict'

	var request = require('request');
	var $ = require('cheerio');
	var json = require('jsonFile');
	var dataFile = './data.json';
	var twilioConfig = require('./twilio.config.dev.js');

	var pollMin = 15000; // 15 sec
	var pollMax = 20000; // 20 sec

	function sendAlert(address) {
		var twilio = require('twilio');
		var client = new twilio.RestClient(twilioConfig.accountSid, twilioConfig.authToken);

		client.messages.create({
		    to: twilioConfig.toPhoneNum,
		    from: twilioConfig.twilioPhoneNum,
		    body: address + ' just got posted!'
		}, function(error, message) {
		    if (error) {
		        console.log(error.message);
		    }
		});
	}

	function runRequest(counter) {
		console.log('counter coming in', counter);

		var data = json.readFileSync(dataFile);
		console.log('reading json file', data);

		var query = 'http://www.realtor.com/realestateandhomes-search/Edmond_OK/beds-3/baths-2/price-125000-150000/sqft-6';
		//var query = 'http://brandonclapp.com';

		request(query, function(error, response, body) {

			var latestAddress = $(body).find('.js-record-user-activity').first().find('.listing-street-address').text();
			//var latestAddress = $(body).find('title').text();

			if(counter) {
				console.log(counter + ' time around...');
				// compare it with the latestAddress in data store
				if(data.latestAddress !== latestAddress) {
					console.log('its new, send text');
					sendAlert(latestAddress);
				}
			}

			json.writeFileSync(dataFile, { "latestAddress": latestAddress });

			counter++;
		});
	}

	function init() {
		var counter = 0;
	    var poll = function() {

	        runRequest(counter);
			counter++;
	        var rand = Math.round(Math.random() * (pollMax - pollMin)) + pollMin; // generate new time between min and max
	        setTimeout(poll, rand);
	    }

    	poll();
	}

	init();

})();
