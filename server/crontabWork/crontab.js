'use strict';

var _ = require('lodash');
var q = require('q');
var invoice = require('../api/invoice/invoice.controller.js');
var rewards = require('../api/reward/reward.controller.js');
var schedule = require('node-schedule');
var moment = require('moment');
var winston = require('winston');

var mailChimp = require('../api/thing/thing.controller.js');

winston.add(winston.transports.File, {filename: 'Benson.log'}); 

var j = schedule.scheduleJob({hour: 8, minute: 0}, function(){
	var date = new Date();
	var yesterday = date.setDate(date.getDate() - 1);
	invoice.AutoCreateInvoiceNo(yesterday)
  	winston.info({message: 'Update Invoice!  ' + date});
});

var autoAddRewardCrontab = schedule.scheduleJob({hour: 23, minute: 0}, function(){
	var now = moment();
	var today = moment().format('YYYY-MM-DD');
	var yesterday = now.subtract(1, 'days').format('YYYY-MM-DD');
	var _7_DaysBefore = now.subtract(7, 'days').format('YYYY-MM-DD');
	var _15_DaysBefore = now.subtract(15, 'days').format('YYYY-MM-DD');


	rewards.addRewardsWithStatusAndDate(40, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for ATM shipped
	rewards.addRewardsWithStatusAndDate(20, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for Credit Card shipped
	
	rewards.addRewardsWithStatusAndDate(32, _7_DaysBefore).then(function(result) {winston.info({message: result})}); // check 7 days before, for 貨到付款 shipped

	rewards.addRewardsWithStatusAndDate(28, _15_DaysBefore).then(function(result) {winston.info({message: result})}); // check 15 days before, for 超商付款 shipped

	rewards.removeRewardsWithStatusAndDate(46, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
	rewards.removeRewardsWithStatusAndDate(45, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
});

var rule = new schedule.RecurrenceRule();
rule.minute = new schedule.Range(0, 59, 1);


// var GoogleSpreadsheet = require('google-spreadsheet');
// var my_sheet = new GoogleSpreadsheet('1QBeGac2BSk4yyjekSBfCFumDC6ZKa1s9wmSv6QZ8zeA');
// var creds = require('../config/women-day-2016-03-08-a1c07974f9c1.json');
// var autoAddWomenPageMailChimpList = schedule.scheduleJob(rule, function() {
// 	my_sheet.useServiceAccountAuth(creds, function(err) {
// 		// console.log(err);
// 		my_sheet.getInfo(function(err, sheet_info) {
// 			console.log(sheet_info.title + ' is loaded');
// 		});
// 		my_sheet.getRows(1, {
// 			orderby: '妳的大名'
// 		}, function(err, rows) {
// 			var ldata = [];
// 			ldata = _.reduce(rows, function(ldata, row) {
// 				ldata.push({name: row['妳的大名'], email: row['妳的聯絡信箱']});
// 				return ldata;
// 			}, ldata);
// 			mailChimp.addMCListSubscribers('5c2e2f71e3', ldata)
// 			.then(function(data) {
// 				console.log(moment().format('YYYY-MM-DD hh:mm') + ' google mail list sync to mailchimp');
// 			});
// 		});
// 	});
// });

var date = new Date();
var yesterday = date.setDate(date.getDate() - 1);
invoice.AutoCreateInvoiceNo(yesterday)
winston.info({message: 'Update Invoice!  ' + date});
var now = moment();
var today = moment().format('YYYY-MM-DD');
var yesterday = now.subtract(1, 'days').format('YYYY-MM-DD');
var _7_DaysBefore = now.subtract(7, 'days').format('YYYY-MM-DD');
var _15_DaysBefore = now.subtract(15, 'days').format('YYYY-MM-DD');
rewards.addRewardsWithStatusAndDate(40, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for ATM shipped
rewards.addRewardsWithStatusAndDate(20, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for Credit Card shipped
rewards.addRewardsWithStatusAndDate(32, _7_DaysBefore).then(function(result) {winston.info({message: result})}); // check 7 days before, for 貨到付款 shipped
rewards.addRewardsWithStatusAndDate(28, _15_DaysBefore).then(function(result) {winston.info({message: result})}); // check 15 days before, for 超商付款 shipped
rewards.removeRewardsWithStatusAndDate(46, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
rewards.removeRewardsWithStatusAndDate(45, today).then(function(result) {winston.info({message: result})});  // check everyday, for 宅配未取，取消他的紅利點數
