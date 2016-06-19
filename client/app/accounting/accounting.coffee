'use strict'

angular.module 'goRocketApp'
.config ($stateProvider) ->
  $stateProvider
  .state 'accounting',
    url: '/accounting'
    templateUrl: 'app/accounting/accounting.html'
    controller: 'AccountingCtrl'
