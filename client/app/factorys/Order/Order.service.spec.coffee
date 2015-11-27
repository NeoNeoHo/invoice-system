'use strict'

describe 'Service: Order', ->

  # load the service's module
  beforeEach module 'goRocketApp'

  # instantiate service
  Order = undefined
  beforeEach inject (_Order_) ->
    Order = _Order_

  it 'should do something', ->
    expect(!!Order).toBe true