(function() {
    'use strict'

    var request = require('request');
    var $ = require('cheerio');
    var json = require('jsonFile');
    var twilioConfig = require('./twilio.config.dev.js');

    var pollMin = 15000; // 15 sec
    var pollMax = 20000; // 20 sec

    var queries = [{
        label: 'realtor',
        url: 'http://www.realtor.com/realestateandhomes-search/Edmond_OK/beds-3/baths-2/price-125000-150000/sqft-6',
        getLatestAddress: function(body) {
            return $(body).find('.js-record-user-activity').first().find('.listing-street-address').text();
        }
    }, {
        label: 'brandonclapp',
        url: 'http://brandonclapp.com',
        getLatestAddress: function(body) {
            return $(body).find('title').text();
        }
    }];

    function sendAlert(address) {
        var twilio = require('twilio');
        var client = new twilio.RestClient(twilioConfig.accountSid, twilioConfig.authToken);

		if(!twilioConfig.toPhoneNums || twilioConfig.toPhoneNums.length === 0) {
			console.log('Incorrect configuration. Include \'toPhoneNums\' in twilio.config.js');
		}

        for(var i = 0; i < twilioConfig.toPhoneNums.length; i++) {
			var thisPhoneNum = twilioConfig.toPhoneNums[i];
			console.log('Attempting to send message to ' + thisPhoneNum + ' (#' + i + ')')
			client.messages.create({
	            to: thisPhoneNum,
	            from: twilioConfig.twilioPhoneNum,
	            body: address + ' just got posted!' + ' #' + i
	        }, function(error, message) {
	            if (error) {
	                console.log(error.message);
	            }
	        });
		}
    }

    function runRequest(counter, query) {

        var dataFile = './data/' + query.label + '.json';
        var data = json.readFileSync(dataFile);
        console.log('Reading ' + dataFile + ' json file', data);
		console.log('#' + counter + ' - ' + query.label)
        request(query.url, function(error, response, body) {

            var latestAddress = query.getLatestAddress(body);

            if (counter) {
                // compare it with the latestAddress in data store
                if (data.latestAddress !== latestAddress) {
                    console.log('New listing!');
                    sendAlert(latestAddress);
                }
            }

            json.writeFileSync(dataFile, {
                "latestAddress": latestAddress
            });
            console.log(query.label + ' HTTP request & data store updated');
        });
    }

    function init() {
        var counter = 0;
        var poll = function() {

            for (var i = 0; i < queries.length; i++) {
                runRequest(counter, queries[i]);
            }

            counter++;
            var rand = Math.round(Math.random() * (pollMax - pollMin)) + pollMin; // generate new time between min and max
            setTimeout(poll, rand);
        }

        poll();
    }

    init();

})();
