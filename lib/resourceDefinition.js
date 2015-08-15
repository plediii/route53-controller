"use strict";

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var resourceDefinition = module.exports = {
    parse: function (data) {
        return new Promise(function (resolve, reject) {
            try {
                return resolve(JSON.parse(data));
            } catch (ex) {
                return reject(new Error('Failed to parse JSON:'  + ex.message));
            }
        })
            .then(function (resource) {
                if (!resource.hasOwnProperty('HostedZone')) {
                    throw new Error('Resource is missing HostedZone.');
                }
                if (!resource.hasOwnProperty('resources')) {
                    throw new Error('Resource is missing resources.');
                }
                return resource;
            });
    }
    , read: function (resourcePath) {
        return fs.readFileAsync(resourcePath)
        .then(resourceDefinition.parse);
    }
};
