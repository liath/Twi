/* eslint-env mocha */
/* eslint no-var:0, prefer-arrow-callback:0, func-names:0 */
// I'm sure some more through tests will be useful at a later date,
// but this is sufficient to get rolling with CI. Usually if I break something
// it's on a scale that prevents the app from starting at all, so this is nice.

var request = require('supertest');
describe('loading app', function () {
  var server;
  beforeEach(function () {
    server = require('../app');
  });
  afterEach(function () {
    server.close();
  });
  it('responds to /', function testSlash(done) {
    this.slow(3000);
    request(server)
    .get('/')
    .expect(200, done);
  });
});
