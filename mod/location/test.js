/**
 * @author Pedro Sanders
 * @since v1
 *
 * Unit Test for the version 2 of "Location Service Module"
 */
const assert = require('assert')
const LocatorUtils = require('@routr/location/utils')
const Locator = require('@routr/location/locator')
const RouteLoader = require('@routr/location/route_loader')
const { Status } = require('@routr/core/status')
const SipFactory = Java.type('javax.sip.SipFactory')
const addressFactory = SipFactory.getInstance().createAddressFactory()

describe('Location Service Module', () => {
  let locator
  const agentEndpoint = buildEndpoint('1001', 'sip.local', '192.168.1.2:5061')
  const peerEndpoint = buildEndpoint(
    'ast',
    '192.168.1.2:5061',
    '192.168.1.2:5061'
  )

  before(() => {
    locator = new Locator()
  })

  beforeEach(() => {
    locator.evictAll()
  })

  it('test transforms an AOR to a string', () => {
    const sipURI = addressFactory.createSipURI('john', 'sip.ocean.com')
    let aorString = LocatorUtils.aorAsString(sipURI)
    assert.equal('sip:john@sip.ocean.com', aorString)
    // Testing TelURL
    const telURL = addressFactory.createTelURL('tel:8095863314')
    aorString = LocatorUtils.aorAsString(telURL)
    assert.equal('tel:8095863314', aorString)
    // Test text format
    aorString = LocatorUtils.aorAsString('sip:john@sip.ocean.com')
    assert.equal('sip:john@sip.ocean.com', aorString)
  })

  it('adds an removes a local endpoint', () => {
    locator.addEndpoint(agentEndpoint.aor, agentEndpoint.route)
    let response = locator.findEndpoint(agentEndpoint.aor)
    assert.ok(response.data.length > 0)
    locator.removeEndpoint(agentEndpoint.aor, agentEndpoint.route.contactURI)
    response = locator.findEndpoint(agentEndpoint.aor)
    assert.notEqual(response.status, Status.OK)
  })

  it('will not be routed', () => {
    const response = locator.findEndpoint('sip:4002@sip.local')
    assert.equal(response.status, Status.NOT_FOUND)
  })

  it('it keeps request inside the domain', () => {
    locator.addEndpoint(agentEndpoint.aor, agentEndpoint.route)
    locator.addEndpoint(peerEndpoint.aor, peerEndpoint.route)
    testFE(locator, agentEndpoint.aor)
    testFE(locator, peerEndpoint.aor)
  })

  it('routes thru a gateway', () => {
    const loader = new RouteLoader()
    loader.loadStaticRoutes()
    testFE(locator, 'sip:17853178070@sip.local', true)
  })

  it('ingress thru a aorLink', () => {
    locator.addEndpoint(agentEndpoint.aor, agentEndpoint.route)
    const response = locator.findEndpoint('tel:0000000000')
    assert.equal(response.status, Status.OK)
  })

  it('ingress thru a aorLink', () => {
    locator.addEndpoint(agentEndpoint.aor, agentEndpoint.route)
    const response = locator.findEndpoint('sip:0000000000@192.168.1.2')
    assert.equal(response.status, Status.OK)
  })

  // Test having more than one route per address of record
  it('adds multiple endpoints per aor', () => {
    const ep1 = buildEndpoint('1001', 'sip.local', '192.168.1.2:5061')
    const ep2 = buildEndpoint('1001', 'sip.local', '192.168.1.3:5061', 32)
    locator.addEndpoint(ep1.aor, ep1.route)
    locator.addEndpoint(ep2.aor, ep2.route)
    testFE(locator, ep1.aor)

    // Attempt to add duplicate
    locator.addEndpoint(ep1.aor, ep1.route)
    // Ensure only one entry for contactURI...
    const response = locator.findEndpoint(ep1.aor)
    assert.equal(response.data.length, 2)
  })
})

function testFE (locator, aor, thruGw = false) {
  const response = locator.findEndpoint(aor)
  assert.equal(response.status, Status.OK)
  response.data.forEach(route => assert.equal(route.thruGw, thruGw))
}

function buildEndpoint (username, domain, host, expires = 60) {
  const aor = addressFactory.createSipURI(username, domain)
  const contactURI = addressFactory.createSipURI(username, host)
  const port = Math.floor(Math.random() * 6000) + 5080
  return {
    aor: LocatorUtils.aorAsString(aor),
    route: {
      isLinkAOR: false,
      thruGw: false,
      sentByAddress: 'localhost',
      sentByPort: port,
      received: 'remotehost',
      rport: 5061,
      contactURI: contactURI,
      registeredOn: Date.now(),
      expires: expires,
      nat: false
    }
  }
}
