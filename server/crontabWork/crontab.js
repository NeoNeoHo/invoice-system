'use strict';

var _ = require('lodash');
var q = require('q');
var mysql = require('mysql');
var db_config = require('../config/db_config.js');
var mysql_connection = db_config.mysql_connection;
var mysql_pool = db_config.mysql_pool;
var invoice = require('../api/invoice/invoice.controller.js');
var rewards = require('../api/reward/reward.controller.js');
var schedule = require('node-schedule');

var j = schedule.scheduleJob({hour: 9, minute: 0}, function(){
	var date = new Date();
	var yesterday = date.setDate(date.getDate() - 1);
	invoice.AutoCreateInvoiceNo(yesterday)
  	console.log('Update Invoice!  ' + date);
});

var date = '2015-12-31';
rewards.addRewardsWithStatusAndDate(43, date)
.then(function(result) {console.log(result)});
