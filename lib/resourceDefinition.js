"use strict";

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));


module.exports = {
    read: function (resourcePath) {
        return fs.readFileAsync(resourcePath)
            .then(function (data) {
                try {
                    return JSON.parse(data);
                } catch (ex) {
                    throw new Error('Failed to parse JSON ' + resourcePath + ': ' + ex.message);
                }
            })
            .then(function (resource) {
                if (!resource.hasOwnProperty('HostedZone')) {
                    throw new Error(resourcePath + ' is missing HostedZone');
                }
                if (!resource.hasOwnProperty('resources')) {
                    throw new Error(resourcePath + ' is missing resources');
                }
                return resource;
            });
    }
};
