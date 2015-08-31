"use strict";

var test = require('tape');
var m = require('../lib/updateRecordSets');

test('updateRecordSets', function (t) {
    t.test('recordSetTemplate', function (s) {
        s.plan(1);
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "TTL": 30,
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "A",
            "TTL": 30
        }, ['127.1.1.1']),
                    "Fills in single IP.");
    });
});
