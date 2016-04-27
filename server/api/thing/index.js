'use strict';

var express = require('express');
var controller = require('./thing.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/mailchimp/:list_id', controller.getMCListSubscriber);
router.get('/:id', controller.show);
router.post('/', controller.create);
// router.post('/mailchimp', controller.addMCListSubscriber);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;