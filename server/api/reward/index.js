'use strict';

var express = require('express');
var controller = require('./reward.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/order_id/:order_id', auth.hasRole('admin'), controller.index);


module.exports = router;