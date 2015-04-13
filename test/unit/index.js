var StorageService = require('../../src/index.js');
var expect = require('chai').expect;

describe('StorageService', function() {
  it('should respect logic', function() {
    expect(true).to.equal(true);
    expect(true).to.not.equal(false);
  });
});
