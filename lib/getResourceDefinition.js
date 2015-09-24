"use strict";

var Promise = require('bluebird');
var resourceDefinition = require('../lib/resourceDefinition');
var s3location = require('../lib/s3location');


module.exports = Promise.method(function (AWS, params) {
    var getResource;
    if (params.s3location) {
        return s3location.read(params.s3location)
            .then(function (location) {
                return s3location.download(AWS, location);
            })
            .then(resourceDefinition.parse);
    } else if (params.resource) {
        return resourceDefinition.read(params.resource);
    } else {
        throw new Error('getResourceDefinition requires s3location or resource.');
    }
});
