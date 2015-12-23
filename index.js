/*jslint node: true */
"use strict";

var Promise = require('bluebird');
var fs = require('fs');
var getResourceDefinition = require('./lib/getResourceDefinition');
var updateRecordSets = require('./lib/updateRecordSets');

module.exports = function (AWS, params) {
    var s3LocationPath = params.s3LocationPath;
    var resourcePath = params.resourcePath;
    return getResourceDefinition(AWS, {
        s3location: s3LocationPath
        , resource: resourcePath
    })
        .then(function (resource) {
            return updateRecordSets(AWS, resource);
        });
};
