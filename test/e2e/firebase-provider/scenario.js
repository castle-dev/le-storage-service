var StorageProvider = require('le-storage-provider-firebase');
var Firebase = require('firebase');
var firebaseUrl = process.env.FIREBASE_URL;
var firebaseRef = new Firebase(firebaseUrl);
var provider = new StorageProvider(firebaseRef);
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var StorageService = require('../../../src/storage-service.js');
var storage = new StorageService(provider);

function testUpdateRecordWithInvalidData() {
  describe('update record with invalid data::', function() {
    after(function(){
      setTimeout(function(){
        process.exit(0);
      }, 1000);
    });
    this.timeout(10000);
    it('should reject the promise', function() {
      var record = storage.createRecord('TestRecordType');
      var varName;
      var returnedPromise = record.update({testRecordKey: varName});
      return expect(returnedPromise).to.eventually.be.rejected;
    });
  });
}

testUpdateRecordWithInvalidData();
