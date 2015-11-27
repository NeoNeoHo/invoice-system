'use strict'

describe 'Directive: exportTable', ->

  # load the directive's module
  beforeEach module 'goRocketApp'
  element = undefined
  scope = undefined
  beforeEach inject ($rootScope) ->
    scope = $rootScope.$new()

  it 'should make hidden element visible', inject ($compile) ->
    element = angular.element '<export-table></export-table>'
    element = $compile(element) scope
    expect(element.text()).toBe 'this is the exportTable directive'
