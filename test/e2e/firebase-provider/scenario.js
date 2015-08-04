var StorageProvider = require('le-storage-provider-firebase');
var q = require('q');
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
    it('should reject the promise', function() {
      var record = storage.createRecord('TestRecordType');
      var varName;
      var returnedPromise = record.update({
        testRecordKey: varName
      });
      return expect(returnedPromise).to.eventually.be.rejected;
    });
  });
}

function testFetchRecord() {
  describe('fetch record::', function() {

    var recordToFetch_id;
    var deletedRecord_id;
    before(function(done) {
      firebaseRef.set({}, function() {
        var recordToFetch = storage.createRecord('Owner');
        recordToFetch.setData({
          testData: 'testing 123'
        });
        var promises = [];

        var deletedRecord = storage.createRecord('Owner');
        deletedRecord.setData({
          testData: 'this record will be deleted'
        });
        promises.push(deletedRecord.save().then(function(returnedRecord) {
          deletedRecord_id = returnedRecord.getID();
          return returnedRecord.delete();
        }));
        promises.push(recordToFetch.save().then(function(returnedRecord) {
          recordToFetch_id = returnedRecord.getID();
        }));
        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should fetch the correct record', function(done) {
      storage.fetchRecord('Owner', recordToFetch_id).then(function(returnedRecord) {
        returnedRecord.save().then(function() {
          returnedRecord.load().then(function(returnedRecordData) {
            expect(returnedRecordData.testData).to.equal('testing 123');
            done();
          }, function(err) {
            console.log(err);
          });
        }, function(err) {
          console.log(err);
        });
      })
    });

    it('should fail to fetch the non-existent record', function(done) {
      storage.fetchRecord('Owner', 'deleted record id').then(function(returnedRecord) {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });
    it('should fail to fetch the deleted record', function(done) {
      storage.fetchRecord('Owner', deletedRecord_id).then(function(returnedRecord) {}, function(err) {
        expect(err).to.exist;
        done();
      });
    });
  });
}

function testRecordJoin() {
  describe('Record Join', function() {

    var rootRecordForJoin_id = 'rootRecordForJoin_id';
    var joinedChildRecord1_id = 'joinedChildRecord1_id';
    var joinedChildRecord2_id = 'joinedChildRecord2_id';
    var deletedChildRecord_id = 'deletedChildRecord_id';
    var singleRelationDeleted_id = 'singleRelationDeleted_id';
    var singleRelationExisting_id = 'singleRelationExisting_id';

    before(function(done) {
      firebaseRef.set({}, function() {
        var rootRecordForJoin = storage.createRecord('Parent', rootRecordForJoin_id);
        var rootRecordForJoinData = {};
        rootRecordForJoinData.setField = 'testing 123';
        rootRecordForJoin.setData(rootRecordForJoinData);

        var deletedRecord = storage.createRecord('Child', deletedChildRecord_id);
        var deletedRecordData = {};
        deletedRecordData.someField = 'deleted record data';
        deletedRecordData.deletedAt = new Date();
        deletedRecord.setData(deletedRecordData);

        var joinedChildRecord1 = storage.createRecord('Child', joinedChildRecord1_id);
        var joinedChildRecord1Data = {};
        joinedChildRecord1Data.testField = 'stuff';
        joinedChildRecord1.setData(joinedChildRecord1Data);

        var joinedChildRecord2 = storage.createRecord('Child', joinedChildRecord2_id);
        var joinedChildRecord2Data = {};
        joinedChildRecord2Data.testField = 'stuff';
        joinedChildRecord2.setData(joinedChildRecord2Data);

        var singleRelationDeleted = storage.createRecord('Cat', singleRelationDeleted_id);
        var singleRelationDeletedData = {};
        singleRelationDeletedData.testField = 'deleted stuff';
        singleRelationDeletedData.deletedAt = new Date();
        singleRelationDeleted.setData(singleRelationDeletedData);

        var singleRelationExisting = storage.createRecord('Dog', singleRelationExisting_id);
        var singleRelationExistingData = {};
        singleRelationExistingData.testField = 'stuff';
        singleRelationExisting.setData(singleRelationExistingData);

        rootRecordForJoin.relateToMany('Child');
        rootRecordForJoin.addChild(deletedRecord);
        rootRecordForJoin.addChild(joinedChildRecord1);
        rootRecordForJoin.addChild(joinedChildRecord2);

        rootRecordForJoin.relateToOne('Cat');
        rootRecordForJoin.setCat(singleRelationDeleted);

        rootRecordForJoin.relateToOne('Dog');
        rootRecordForJoin.setDog(singleRelationExisting);

        var promises = [];
        promises.push(rootRecordForJoin.save());
        promises.push(deletedRecord.save());
        promises.push(joinedChildRecord1.save());
        promises.push(joinedChildRecord2.save());
        promises.push(singleRelationDeleted.save());
        promises.push(singleRelationExisting.save());

        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should return the joined data exculding the deleted records', function(done) {
      storage.fetchRecord('Parent', rootRecordForJoin_id).then(function(returnedRecord) {
        returnedRecord.join([{
          type: 'Child',
          many: true
        }, {
          type: 'Cat'
        }, {
          type: 'Dog'
        }]).then(function(data) {
          expect(data.children.length).to.equal(2);
          expect(data.children[0]._id).to.equal(joinedChildRecord1_id);
          expect(data.children[1]._id).to.equal(joinedChildRecord2_id);
          expect(data.dog._id).to.equal(singleRelationExisting_id);
          expect(data.cat).not.to.be.ok;
          done();
        }, function(err) {
          console.log(err);
        });
      })
    });
  });
}

function testCollectionJoin() {
  describe('Collection Join', function() {

    var rootRecord1ID = 'rootRecord1ID';
    var rootDeletedRecordID = 'rootDeletedRecordID';

    before(function(done) {
      firebaseRef.set({}, function() {
        var rootRecord1 = storage.createRecord('Root', rootRecord1ID);
        var rootRecord1Data = {};
        rootRecord1Data.setField = 'testing 123';
        rootRecord1.setData(rootRecord1Data);

        var rootDeletedRecord = storage.createRecord('Root', rootDeletedRecordID);
        var rootDeletedRecordData = {};
        rootDeletedRecordData.someField = 'deleted record data';
        rootDeletedRecordData.deletedAt = new Date();
        rootDeletedRecord.setData(rootDeletedRecordData);
        rootDeletedRecord.setData(rootDeletedRecordData);

        var promises = [];
        promises.push(rootRecord1.save());
        promises.push(rootDeletedRecord.save());

        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should return the joined data exculding the deleted records', function(done) {
      var testCollection = storage.createCollection('Root');
      var validRecord = storage.createRecord('Root', rootRecord1ID);
      var deletedRecord = storage.createRecord('Root', rootDeletedRecordID);
      testCollection.addRecord(deletedRecord);
      testCollection.addRecord(validRecord);
      testCollection.join().then(function(data) {
        expect(data.length).to.equal(1);
        expect(data[0].setField).to.equal('testing 123');
        done();
      }, function(err) {
        console.log(err);
      });
    });
  });
}

function testCollectionLoad() {
  describe('Collection Load', function() {

    var rootRecord1ID = 'rootRecord1ID';
    var rootDeletedRecordID = 'rootDeletedRecordID';

    before(function(done) {
      firebaseRef.set({}, function() {
        var rootRecord1 = storage.createRecord('Root', rootRecord1ID);
        var rootRecord1Data = {};
        rootRecord1Data.setField = 'testing 123';
        rootRecord1.setData(rootRecord1Data);

        var rootDeletedRecord = storage.createRecord('Root', rootDeletedRecordID);
        var rootDeletedRecordData = {};
        rootDeletedRecordData.someField = 'deleted record data';
        rootDeletedRecordData.deletedAt = new Date();
        rootDeletedRecord.setData(rootDeletedRecordData);
        rootDeletedRecord.setData(rootDeletedRecordData);

        var promises = [];
        promises.push(rootRecord1.save());
        promises.push(rootDeletedRecord.save());

        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should return the loaded data exculding the deleted records', function(done) {
      var testCollection = storage.createCollection('Root');
      var validRecord = storage.createRecord('Root', rootRecord1ID);
      var deletedRecord = storage.createRecord('Root', rootDeletedRecordID);
      testCollection.addRecord(deletedRecord);
      testCollection.addRecord(validRecord);
      testCollection.load().then(function(data) {
        expect(data.length).to.equal(1);
        expect(data[0].setField).to.equal('testing 123');
        done();
      }, function(err) {
        console.log(err);
      });
    });
  });
}

function testFetchCollection() {
  describe('fetchCollection', function() {

    var catRecord1ID = 'catRecord1ID';
    var catRecord2ID = 'catRecord2ID';
    var catRecord3ID = 'catRecord3ID';
    var catRecord4ID = 'catRecord4ID';
    var catRecord5ID = 'catRecord5ID';
    var dogRecordID = 'dogRecordID';

    before(function(done) {
      firebaseRef.set({}, function() {
        var catRecord1 = storage.createRecord('Cat', catRecord1ID);
        catRecord1.setData({
          "testing": "cat 1",
          "fieldToCheck": "in collection"
        });
        var catRecord2 = storage.createRecord('Cat', catRecord2ID);
        catRecord2.setData({
          "testing": "cat 2"
        });

        var catRecord3 = storage.createRecord('Cat', catRecord3ID);
        catRecord3.setData({
          "testing": "cat 3",
          "fieldToCheck": "in collection"
        });

        var catRecord4 = storage.createRecord('Cat', catRecord4ID);
        catRecord4.setData({
          "testing": "cat 4",
          "fieldToCheck": "not in collection"
        });

        var catRecord5 = storage.createRecord('Cat', catRecord5ID);
        var carRecord5Data = {
          "testing": "cat 4",
          "fieldToCheck": "in collection"
        };
        carRecord5Data.deletedAt = new Date();
        catRecord5.setData(carRecord5Data);

        var dogRecord = storage.createRecord('Dog', dogRecordID);
        dogRecord.setData({
          "testing": "dog"
        });


        var promises = [];
        promises.push(catRecord1.save());
        promises.push(catRecord2.save());
        promises.push(catRecord3.save());
        promises.push(catRecord4.save());
        promises.push(catRecord5.save());
        promises.push(dogRecord.save());

        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should return all the cat records', function(done) {
      storage.fetchCollection('Cat').then(function(collection) {
        expect(collection.getRecords().length).to.equal(4);
        done();
      }, function(err) {
        console.log(err);
      });
    });

    it('should return all the cat records', function(done) {
      storage.fetchCollection('Cat', 'fieldToCheck', 'in collection').then(function(collection) {
        expect(collection.getRecords().length).to.equal(2);
        done();
      }, function(err) {
        console.log(err);
      });
    });

  });
}

function testRelatesAs() {
  describe('relates as', function() {

    var catRecord1ID = '1';
    var catRecord2ID = '2';
    var dogRecordID = '1';
    var humanRecordID = '1';

    var catRecord;
    var catRecord;
    var dogRecord;
    var humanRecord;

    before(function(done) {
      firebaseRef.set({}, function() {
        catRecord1 = storage.createRecord('Cat', catRecord1ID);
        catRecord1.setData({
          "testing": "cat 1",
          "fieldToCheck": "in collection"
        });
        catRecord2 = storage.createRecord('Cat', catRecord2ID);
        catRecord2.setData({
          "testing": "cat 2"
        });
        dogRecord = storage.createRecord('Dog', dogRecordID);
        dogRecord.setData({
          "testing": "dog",
          "name": "buddy"
        });
        humanRecord = storage.createRecord('Human', humanRecordID);
        humanRecord.setData({
          "testing": "human"
        });


        var promises = [];
        promises.push(catRecord1.save());
        promises.push(catRecord2.save());
        promises.push(dogRecord.save());
        promises.push(humanRecord.save());

        q.all(promises).then(function() {
          done();
        }, function(err) {
          console.log(err);
        });
      });
    });

    it('should relate cats as pets', function () {
      humanRecord.relateToMany('Cat', 'Pet');
      humanRecord.addPet(catRecord1);
      humanRecord.addPet(catRecord2);
      return humanRecord.save()
      .then(function () {
        expect(humanRecord.getData()['pet_ids'][catRecord1ID]).to.be.true;
        expect(humanRecord.getData()['pet_ids'][catRecord2ID]).to.be.true;
        return humanRecord.getPets().load();
      })
      .then(function (pets) {
        expect(pets).to.have.length(2);
      });
    });

    it('should relate dog as best friend', function () {
      humanRecord.relateToOne('Dog', 'Best Friend');
      humanRecord.setBestFriend(dogRecord);
      return humanRecord.save()
      .then(function () {
        expect(humanRecord.getData()['bestFriend_id']).to.equal(dogRecordID);
        return humanRecord.getBestFriend().load();
      })
      .then(function (bestFriend) {
        expect(bestFriend.name).to.equal('buddy');
      });
    });

    it('should not mix types when relating as', function () {
      humanRecord.relateToMany('Cat', 'Pet');
      expect(function () {
        humanRecord.addPet(dogRecord);
      }).to.throw();
      dogRecord.relateToOne('Human', 'Owner');
      expect(function () {
        dogRecord.setOwner(catRecord1);
      }).to.throw();
    });
  });
}

function runTests () {
  describe('le-storage-service e2e tests', function () {
    /*after(function() {
      setTimeout(function() {
        process.exit(0);
      }, 1000);
    });*/
    this.timeout(10000);
    testFetchRecord();
    testUpdateRecordWithInvalidData();
    testRecordJoin();
    testCollectionJoin();
    testCollectionLoad();
    testFetchCollection();
    testRelatesAs();
  });
}

runTests();
