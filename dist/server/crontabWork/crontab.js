'use strict';

var _ = require('lodash');
var q = require('q');
var invoice = require('../api/invoice/invoice.controller.js');
var rewards = require('../api/reward/reward.controller.js');
var customer = require('../api/customer/customer.controller.js');
var api_config = require('../config/api_config');
var schedule = require('node-schedule');
var moment = require('moment');
var winston = require('winston');
var mailChimp = require('../api/thing/thing.controller.js');


winston.add(winston.transports.File, {filename: 'Benson.log'}); 


// ###################  Invoice Adding System ######################
var j = schedule.scheduleJob({hour: 8, minute: 0}, function(){
	var date = new Date();
	var initial_date = '2016-06-14';
	invoice.AutoCreateInvoiceNo(initial_date);
	winston.info({message: 'Update Invoice!  ' + date});
});

var initial_date = '2016-06-14';
invoice.AutoCreateInvoiceNo(initial_date);

// ###################  Rewards Adding System ######################
var autoAddRewardCrontab = schedule.scheduleJob({hour: 23, minute: 0}, function(){
	var now = moment();
	var today = moment().format('YYYY-MM-DD');
	var yesterday = now.subtract(1, 'days').format('YYYY-MM-DD');
	var _7_DaysBefore = now.subtract(6, 'days').format('YYYY-MM-DD');
	var _15_DaysBefore = now.subtract(7, 'days').format('YYYY-MM-DD');


	rewards.addRewardsWithStatusAndDate(21, today).then(function(result) {winston.info({message: result})});
	rewards.addRewardsWithStatusAndDate(29, today).then(function(result) {winston.info({message: result})});	
	rewards.addRewardsWithStatusAndDate(34, today).then(function(result) {winston.info({message: result})});

	rewards.removeRewardsWithStatusAndDate(46, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
	rewards.removeRewardsWithStatusAndDate(45, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
});



// ###################  SendGrid Integration ######################
var sg = require('sendgrid').SendGrid(api_config.SENDGRID_API_KEY);
var request = sg.emptyRequest();

request.method = 'POST';
request.path = '/v3/mail/send';
request.body = {
	"content": [
	{
		"type": "text/html",
		"value": " "
	}
	],
	"from": {
		"email": "benson@vecsgardenia.com",
		"name": "Benson Ho"
	},
	"personalizations": [
		{
			"subject": "Hello, World!",
			"substitutions": {
				"-name-": "Benson",

				"-order_id-": "10293",

				"-invoice_no-": "FD12345678"
			},
			"to": [
				{
					"email": "b95042@gmail.com"
				}
			]
		},
		{
			"subject": "Hello, World!",
			"substitutions": {
				"-name-": "Emily",

				"-order_id-": "10293",

				"-invoice_no-": "FD12345678"
			},
			"to": [
				{
					"email": "b95042@gmail.com"
				}
			]
		}
	],
	"reply_to": {
		"email": "benson@vecsgardenia.com",
		"name": "Benson Ho"
	},
	"subject": "Hello, World!",
	"template_id": "71abec21-e89e-4bf1-aca0-79fa509fae4c",
	// "send_at": Math.round(new Date().getTime()/1000),
	"tracking_settings": {
		"click_tracking": {
			"enable": true,
			"enable_text": true
		},
		"ganalytics": {
			"enable": true,
			"utm_campaign": "sendgrid",
			"utm_content": "sendgrid",
			"utm_medium": "email",
			"utm_name": "invoice",
			"utm_term": ""
		},
		"open_tracking": {
			"enable": true,
			"substitution_tag": "%opentrack"
		},
		"subscription_tracking": {
			"enable": true,
			"html": "If you would like to unsubscribe and stop receiving these emails <% clickhere %>.",
			"substitution_tag": "<%click here%>",
			"text": "If you would like to unsubscribe and stop receiveing these emails <% click here %>."
		}
	}
};


sg.API(request, function (response) {
	console.log(response.statusCode);
	console.log(response.body);
	console.log(response.headers);
});

// ###################  DB Customer to MailChimp Integration ######################
// var customer_update_rule = new schedule.RecurrenceRule();
// customer_update_rule.minute = new schedule.Range(0, 59, 1);
// var syncCustomer2MailChimp = schedule.scheduleJob(customer_update_rule, function() {
// 	var now = moment();
// 	var today = moment().format('YYYY-MM-DD');
// 	customer.getCustomerByDate(today)
// 	.then(
// 		function(rows) {
// 			var ldata = [];
// 			ldata = _.reduce(rows, function(ldata, row) {
// 				ldata.push({name: row.firstname, email: row.email, telephone: row.telephone});
// 				return ldata;
// 			}, ldata);
// 			mailChimp.addMCListSubscribers(api_config.mailChimp_lists_ids['customer_list'], ldata)
// 			.then(function(data) {
// 				console.log(moment().format('YYYY-MM-DD hh:mm') + ' customer list sync to mailchimp');
// 				// console.log(data);
// 			});
// 		}
// 	);
// });


// ###################  Google Sheet to MailChimp Integration ######################

// var rule = new schedule.RecurrenceRule();
// rule.minute = new schedule.Range(0, 59, 1);

// var GoogleSpreadsheet = require('google-spreadsheet');
// var my_sheet = new GoogleSpreadsheet(api_config.google_sheets['mrt_sheet']);
// var creds = require('../config/2016_google_developer_cred.json');
// var autoAddWomenPageMailChimpList = schedule.scheduleJob(rule, function() {
// 	my_sheet.useServiceAccountAuth(creds, function(err) {
// 		// console.log(err);
// 		my_sheet.getInfo(function(err, sheet_info) {
// 			console.log(sheet_info.title + ' is loaded');
// 		});
// 		my_sheet.getRows(1, {
// 			orderby: '時間戳記'
// 		}, function(err, rows) {
// 			var ldata = [];
// 			ldata = _.reduce(rows, function(ldata, row) {
// 				ldata.push({name: row['您的姓名'], email: row['您的email'], telephone: row['您的電話'], address: row['您的地址']});
// 				return ldata;
// 			}, ldata);
// 			mailChimp.addMCListSubscribers(api_config.mailChimp_lists_ids['mrt_leads'], ldata)
// 			.then(function(data) {
// 				console.log(moment().format('YYYY-MM-DD hh:mm') + ' google mail list sync to mailchimp');
// 			});
// 		});
// 	});
// });


// ###################  Reward Adding System Initialation ######################

// var date = new Date();
// var yesterday = date.setDate(date.getDate() - 1);
// invoice.AutoCreateInvoiceNo(yesterday)
// winston.info({message: 'Update Invoice!  ' + date});
// var now = moment();
// var today = moment().format('YYYY-MM-DD');
// var yesterday = now.subtract(1, 'days').format('YYYY-MM-DD');
// var _7_DaysBefore = now.subtract(7, 'days').format('YYYY-MM-DD');
// var _15_DaysBefore = now.subtract(15, 'days').format('YYYY-MM-DD');
// rewards.addRewardsWithStatusAndDate(40, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for ATM shipped
// rewards.addRewardsWithStatusAndDate(20, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for Credit Card shipped
// rewards.addRewardsWithStatusAndDate(32, _7_DaysBefore).then(function(result) {winston.info({message: result})}); // check 7 days before, for 貨到付款 shipped
// rewards.addRewardsWithStatusAndDate(28, _15_DaysBefore).then(function(result) {winston.info({message: result})}); // check 15 days before, for 超商付款 shipped
// rewards.removeRewardsWithStatusAndDate(46, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
// rewards.removeRewardsWithStatusAndDate(45, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數