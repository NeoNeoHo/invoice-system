'use strict';

var express = require('express');
var controller = require('./accounting.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/check/ezship/:file_name/:balanced_document', auth.hasRole('admin'), controller.checkEzship);
router.get('/check/ezcat/:file_name/:balanced_document', auth.hasRole('admin'), controller.checkEzcat);


module.exports = router;