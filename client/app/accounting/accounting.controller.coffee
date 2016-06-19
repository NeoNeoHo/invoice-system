'use strict'

angular.module 'goRocketApp'
.controller 'AccountingCtrl', ($scope, $http, $q, Auth, User, Upload) ->
	$http.get '/api/users'
	.success (users) ->
		$scope.users = users

	$scope.delete = (user) ->
		User.remove id: user._id
		_.remove $scope.users, user
	
	$scope.with_btn_anaylse_enabled = false

	$scope.upload = (file, url) ->
		defer = $q.defer()
		Upload.upload(
			url: url
			method: 'POST'
			data:
				file: file
		).then ((resp) ->
			console.log 'Success ' + resp.config.data.file.name + ' uploaded. Response: ' + resp.data
			result = {
				server_file_path: resp.data
				balanced_document: resp.config.data.file.name.split('.')[0].split('_')[3]
			}
			defer.resolve(result)
		), ((resp) ->
			console.log 'Error status: ' + resp.status
			defer.reject(resp.status)
		), (evt) ->
			progressPercentage = parseInt(100.0 * evt.loaded / evt.total)
			console.log 'progress: ' + progressPercentage + '% ' + evt.config.data.file.name
			return
		return defer.promise

	$scope.submit_ezship_form = () ->
		if $scope.ezship_form.ezship_file.$valid && $scope.ezship_file
			$scope.upload($scope.ezship_file, 'api/uploads/accounting/ezship').then ((data) ->
				$scope.with_btn_anaylse_enabled = true
				$scope.server_file_path = data.server_file_path
				$scope.balanced_document = data.balanced_document
				), (err) ->
				$scope.with_btn_anaylse_enabled = false
				console.log(err)

	$scope.analyse_ezshp_accounting = () ->
		$http.get 'api/accountings/check/ezship/'+$scope.server_file_path+ '/'+$scope.balanced_document, ((resp) ->
			console.log resp
			return
		), (err) ->
			console.log err.status
			return

