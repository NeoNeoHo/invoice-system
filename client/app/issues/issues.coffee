'use strict'

angular.module 'goRocketApp'
.config ($stateProvider) ->
  $stateProvider
  .state 'issues',
    url: '/issues'
    templateUrl: 'app/issues/issues.html'
    controller: 'IssuesCtrl'
