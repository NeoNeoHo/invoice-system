'use strict'

angular.module 'goRocketApp'
.controller 'NavbarCtrl', ($scope, $location, Auth) ->
	$scope.menu = [
		{
			title: 'Home'
			link: '/'
		}
		{
			title: 'Accounting'
			link: '/accounting'
		}
		{
			title: 'Issues'
			link: '/issues'
		}
	]
	$scope.isCollapsed = true
	$scope.isLoggedIn = Auth.isLoggedIn
	$scope.isAdmin = Auth.isAdmin
	$scope.getCurrentUser = Auth.getCurrentUser

	$scope.logout = ->
		Auth.logout()
		$location.path '/login'

	$scope.isActive = (route) ->
		route is $location.path()