'use strict';

var _ = require('lodash');
var q = require('q');
var db_config = require('../../config/db_config.js');
var mysql_pool = db_config.mysql_pool;
var api_config = require('../../config/api_config');
var Order = require('../../api/order/order.controller.js');
var twilio = require('twilio')(api_config.TWILIO.accountSid, api_config.TWILIO.authToken);


// Get list of orders
var sendSMS = function(sms_coll) {
	// sms = {to: '+886XXXXXXXXX', body: 'content'}
	// var defer = q.defr();
	_.forEach(sms_coll, function(sms) {
		twilio.messages.create({
			to: sms.to,
			from: api_config.TWILIO.number,
			body: sms.body
		}, function(err, message) {
			if(err) console.log(err);
			console.log(message.sid);
		});		
	});
};

function handleError(res, err) {
	return res.status(500).send(err);
}

exports.sendSMS = sendSMS;