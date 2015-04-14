le-storage-service
=========

**A simple ORM for real-time datastores**

This service and the objects it creates rely heavily on promises for asynchronous tasks. A storage
provider (such as [le-storage-provider-firebase](http://dev.entercastle.com/le-storage-provider-firebase/)) is
required when constructing the storage object.

![Build Status](https://api.travis-ci.org/castle-dev/le-storage-service.svg?branch=develop "Build Status")

[![Dependency Status](https://david-dm.org/castle-dev/le-storage-service.svg)](https://david-dm.org/castle-dev/le-storage-service)

## Installation

  `npm install le-storage-service --save`

## Usage

```
  var StoragePovider = require('le-storage-provider-firebase');
  var provider = new StorageProvider(/* your firebase url */);
  var StorageService = require('le-storage-service');
  var storage = new StorageService(provider);

  var castle = storage.createRecord('Company');
  castle.update({name: 'Castle', industry: 'Real Estate', founded: 2014})
  .then(function () {
    ...
  });
```

## Tests

* `npm test` to run unit tests once
* `gulp tdd` to run unit tests on every file change

## Contributing

Please follow the project's [conventions](https://github.com/castle-dev/le-storage-service/blob/master/CONTRIBUTING.md) or your changes will not be accepted

## Release History

* 1.0.0 Add RecordService and CollectionService
* 0.1.3 Configure Travis CI to publish docs to GitHub Pages
* 0.1.2 Add Dependency Status Badge
* 0.1.1 Add Travis CI
* 0.1.0 Initial release
