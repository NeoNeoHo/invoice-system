'use strict'

angular.module 'goRocketApp'
.directive 'exportTable', ->
	restrict: 'C'
	link: (scope, element, attrs) ->
		scope.$on 'export-pdf', (e, d) ->
			element.tableExport
				type: 'pdf'
				escape: 'false'
			return
		scope.$on 'export-excel', (e, d) ->
			element.tableExport
				type: 'excel'
				escape: 'false'
			return
		scope.$on 'export-doc', (e, d) ->
			element.tableExport
				type: 'doc'
				escape: 'false'
			return