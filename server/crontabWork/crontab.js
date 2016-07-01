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
var accounting = require('../api/accounting/accounting.controller.js');
var Order = require('../api/order/order.controller.js');
var twilio = require('../api/twilio/twilio.controller.js');
winston.add(winston.transports.File, {filename: 'Benson.log'}); 


// twilio.sendSMS([{to:'+886912412381', body:'這是假的測試信，我在星巴克發的'},{to:'+886975751175', body:'這是假的測試信，我在星巴克發的'}]);

// ###################  Accounting for Ezcat and Credit Card  ########################
// ####  ToDo: This section should be automatized 
// ####		   by linking ezcat's and credit card company's system
// ####################################################################################
var accountingCrontab = schedule.scheduleJob({hour: 8, minute: 0}, function(){
	var lnow = moment();
	var ltoday = moment().format('YYYY-MM-DD');
	var lyesterday = lnow.subtract(1, 'days').format('YYYY-MM-DD');
	var l_7_DaysBefore = lnow.subtract(6, 'days').format('YYYY-MM-DD');
	accounting.checkCreditCard(lyesterday);
	accounting.checkEzcat(l_7_DaysBefore);
});


// ###################  Invoice Adding System and Invoice Mailing System ######################
// ####
// ####
// ############################################################################################
var j = schedule.scheduleJob({hour: 9, minute: 0}, function(){
	var date = new Date();
	var initial_date = '2016-06-14';
	invoice.AutoCreateInvoiceNo(initial_date);
	winston.info({message: 'Update Invoice!  ' + date});
});


// ###################  Rewards Adding System ######################
// ####
// ####
// #################################################################
var autoAddRewardCrontab = schedule.scheduleJob({hour: 10, minute: 0}, function(){
	var now = moment();
	var today = moment().format('YYYY-MM-DD');

	rewards.addRewardsWithStatusAndDate(21, today).then(function(result) {winston.info({message: result})});    // 完成交易，貨到付款
	rewards.addRewardsWithStatusAndDate(29, today).then(function(result) {winston.info({message: result})});	// 完成交易，信用卡
	rewards.addRewardsWithStatusAndDate(34, today).then(function(result) {winston.info({message: result})});	// 完成交易，超商付款

	rewards.removeRewardsWithStatusAndDate(46, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
	rewards.removeRewardsWithStatusAndDate(45, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
});


// ###################  Example of How to Send SendGrid ######################
// ####
// ####
// ###########################################################################
var order_status_fail_id = 10;
var order_status_pending_id = [48, 49];

var oop_schedule_rule = new schedule.RecurrenceRule();
oop_schedule_rule.minute = new schedule.Range(0, 59, 1);
var OopsCron1 = schedule.scheduleJob(oop_schedule_rule, function() {
	var promises = [];
	promises.push(Order.getOopsFailOrders(5, 61, order_status_fail_id));
	promises.push(Order.getOopsFailOrders(120, 61, order_status_pending_id[0]));
	promises.push(Order.getOopsFailOrders(120, 61, order_status_pending_id[1]));
	q.all(promises).then(function(datas) {
		var lorders = datas[0].concat(datas[1]).concat(datas[2]);
		sendgrid.getOopsPersonalizations(_.pluck(lorders, 'order_id')).then(function(personalizations_coll) {
			console.log(personalizations_coll);
			sendgrid.sendOopsMail(personalizations_coll).then(function(resp) {
				console.log(resp);
			}, function(err) {
				console.log(err);
			});
		});
	}, function(err) {
		console.log(err);
	});
});

// ###################  DB Customer to MailChimp Integration ######################
// ####
// ####
// ################################################################################
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
// 			mailchimp.addMCListSubscribers(api_config.mailChimp_lists_ids['customer_list'], ldata)
// 			.then(function(data) {
// 				console.log(moment().format('YYYY-MM-DD hh:mm') + ' Auto customer list sync to mailchimp');
// 			});
// 		}
// 	);
// });


// ###################  Google Sheet to MailChimp Integration ######################
// ####
// ####
// #################################################################################
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
