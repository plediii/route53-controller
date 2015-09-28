"use strict";

var test = require('tape');
var m = require('../../lib/createPolicy');
var _ = require('lodash');
var pathlib = require('path');

var testResource = {
    "HostedZone": "Z148QEXAMPLE8V",
    "Resources": {
        "bar.example": {
            "Instances": [
                {
                    "PrivateIP": true,
                    "Filters": [
                        {
                            "Name": "tag:Name",
                            "Values": [
                                "bar.example"
                            ]
                        }
                    ]
                }
            ],
            "ResourceRecordSet": {
                "Name": "bar.example.com",
                "TTL": 30
            }
        }
    }
};

test('createPolicy', function (t) {
    t.test('Requires resource object', function (r) {
        r.plan(1);
        m({})
        .catch(function (err) {
            r.ok(err.message.match('/resource/'), 'Reject references expected parameter');
        });
    });
});

