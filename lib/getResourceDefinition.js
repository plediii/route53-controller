"use strict";

var Promise = require('bluebird');
var resourceDefinition = require('../lib/resourceDefinition');
var s3location = require('../lib/s3location');


module.exports = Promise.method(function (params) {
    var getResource;
    if (params.s3Location) {
        return s3location.read(params.s3Location)
            .then(s3location.download)
            .then(resourceDefinition.parse);
    } else if (params.resource) {
        return resourceDefinition.read(params.resource);
    } else {
        throw new Error('getResourceDefinition requires s3Location or resource.');
    }
});
