'use strict';

var express = require('express');
var controller = require('./upload.controller');
var auth = require('../../auth/auth.service');
var multiparty = require('connect-multiparty');
var upload_config = require('../../config/upload_config.js');
var ezship_multiparty = new multiparty({uploadDir: upload_config.accounting.ezship_dir});
var ezcat_multiparty = new multiparty({uploadDir: upload_config.accounting.ezcat_dir});

var router = express.Router();

router.post('/accounting/ezship', auth.hasRole('admin'), ezship_multiparty, controller.accounting_ezship);
router.post('/accounting/ezcat', auth.hasRole('admin'), ezcat_multiparty, controller.accounting_ezcat);


module.exports = router;