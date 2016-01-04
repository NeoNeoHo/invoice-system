'use strict';

var _ = require('lodash');
var q = require('q');
var invoice = require('../api/invoice/invoice.controller.js');
var rewards = require('../api/reward/reward.controller.js');
var schedule = require('node-schedule');
var moment = require('moment');
var winston = require('winston');
winston.add(winston.transports.File, {filename: 'Benson.log'}); 

var j = schedule.scheduleJob({hour: 9, minute: 0}, function(){
	var date = new Date();
	var yesterday = date.setDate(date.getDate() - 1);
	invoice.AutoCreateInvoiceNo(yesterday)
  	winston.info({message: 'Update Invoice!  ' + date});
});

var autoAddRewardCrontab = schedule.scheduleJob({hour: 21, minute: 0}, function(){
	var now = moment();
	var today = moment().format('YYYY-MM-DD');
	var yesterday = now.subtract(1, 'days').format('YYYY-MM-DD');
	var _7_DaysBefore = now.subtract(7, 'days').format('YYYY-MM-DD');
	var _15_DaysBefore = now.subtract(15, 'days').format('YYYY-MM-DD');


	rewards.addRewardsWithStatusAndDate(40, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for ATM shipped
	rewards.addRewardsWithStatusAndDate(20, yesterday).then(function(result) {winston.info({message: result})}); // check yesterday, for Credit Card shipped
	
	rewards.addRewardsWithStatusAndDate(32, _7_DaysBefore).then(function(result) {winston.info({message: result})}); // check 7 days before, for 貨到付款 shipped

	rewards.addRewardsWithStatusAndDate(28, _15_DaysBefore).then(function(result) {winston.info({message: result})}); // check 15 days before, for 超商付款 shipped
});

