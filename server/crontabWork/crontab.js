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
var mailchimp = require('../api/thing/thing.controller.js');
var sendgrid = require('../api/sendgrid/sendgrid.controller.js');
var utf8 = require('utf8');


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

// sendgrid.getOrdersPersonalizations([33024, 33019, 32998]).then(function(personalizations_coll) {
// 	console.log(personalizations_coll);
// 	sendgrid.sendInvoiceMail(personalizations_coll).then(function(resp) {
// 		console.log(resp);
// 	}, function(err) {
// 		console.log(err);
// 	});
// }, function(err) {
// 	console.log(err);
// });


// ###################  DB Customer to MailChimp Integration ######################
var customer_update_rule = new schedule.RecurrenceRule();
customer_update_rule.minute = new schedule.Range(0, 59, 1);
var syncCustomer2MailChimp = schedule.scheduleJob(customer_update_rule, function() {
	var now = moment();
	var today = moment().format('YYYY-MM-DD');
	customer.getCustomerByDate(today)
	.then(
		function(rows) {
			var ldata = [];
			ldata = _.reduce(rows, function(ldata, row) {
				ldata.push({name: row.firstname, email: row.email, telephone: row.telephone});
				return ldata;
			}, ldata);
			mailchimp.addMCListSubscribers(api_config.mailChimp_lists_ids['customer_list'], ldata)
			.then(function(data) {
				console.log(moment().format('YYYY-MM-DD hh:mm') + ' customer list sync to mailchimp');
				// console.log(data);
			});
		}
	);
});


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
// 			mailchimp.addMCListSubscribers(api_config.mailChimp_lists_ids['mrt_leads'], ldata)
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
