"use strict";

var test = require('tape');
var m = require('../lib/updateRecordSets');

test('updateRecordSets', function (t) {
    t.test('changeTemplate', function (s) {
        s.plan(1);
        s.deepEqual({
            Action: 'UPSERT'
            , ResourceRecordSet: {
                a: 'z'
            }
        }, m.changeTemplate({ a: 'z' }),
                    "Fills in ResourceRecordSet.");
    });


    t.test('recordSetTemplate', function (s) {
        s.plan(6);
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "A",
        }, ['127.1.1.1']),
                    "Fills in single IP.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }, {
                Value: '127.1.1.2'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "A",
        }, ['127.1.1.1', '127.1.1.2']),
                    "Fills in two ips IP.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "AA",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "AA",
        }, ['127.1.1.1']),
                    "Type overridable.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
        }, ['127.1.1.1']),
                    "Type optional.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "TTL": 30,
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "TTL": 30
        }, ['127.1.1.1']),
                    "Additional parameters available.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "ResourceRecords": [{
                Value: '192.168.0.1'
            }]
        }, ['127.1.1.1']),
                    "ResourceRecords overriden.");
    });
});
