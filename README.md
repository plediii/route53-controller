# route53-controller

When launching new EC2 instances in AWS, it is often desirable to add
the new instance's IP to a route53 record set.  For instance when an
autoscaling group launches a new node, AWS provides facilities to
automatically add the instances to a load balancer, but there are no
facilities to automatically add the new instance to a route53 record
set. 

An alternative option to `route53-controller` is to include a script
in the image or user data which will modify the record set whenever
the new instance boots.  While `route53-controller` could be the
script to provide this functionality, this route requires including
permissions to modify route53 record sets for any process executing on
the instance.  By moving the record set modification to an AWS Lambda
function, only this restricted piece of code requires the permissions
to modify record sets.

`route53-controller` provides the scripts to automatically modify
route53 record sets from an AWS Lambda function.  The user provides
pairs of `ec2.describeInstances` Filters and associated route53 record
sets.  When the lambda function is executed, the IPs of the instances
matching the filters are added to the record set.

## `resource.json`

The list of instances and associated route53 record sets are described
by a `resource.json` file.  For example:

```javascript
{
  "HostedZone": "XXXXXXXXXXXXXX",
  "resources": {
        "bar.example": {
            "Filters": [
                {
                    "Name": "tag:Name",
                    "Values": [ "bar.example" ]
                }
            ],
            "ResourceRecordSet": { 
                "Name": "bar.example.com",
                "Type": "A",
                "TTL": 30
            }
        },
        "foo.example": {
            "Filters": [
                {
                    "Name": "tag:Name",
                    "Values": [ "foo.example" ]
                }
            ],
	    "PrivateIP": true,
            "ResourceRecordSet": { 
                "Name": "foo.example.com",
                "Type": "A",
                "TTL": 30
            }
        }

    }
}
```

Here, the `resource.json` file describes modifying the recordset in
the given HostedZone.  All instances tagged with the `Name` of
`bar.example` are included as IPs in the record set `bar.example.com`,
and all instances tagged with the `Name` of `foo.example` are included
as IPs in the record set `foo.example.com`.

The root `resources` attribute is a map of resource names to the pairs
of `Filters` and `ResourceRecordSet`.  The resource names are for
documentation purposes only and are arbitrary.

For each resource in `resources`, the `Filters` attribute is a list of
filters to be used in an `ec2.describeInstances` operation.  See the
[API
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property)
for more information.

The `ResourceRecordSet` is a `ResourceRecordSet` to be used in a
`route53.changeResourceRecordSets` operation.  See [API
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html#changeResourceRecordSets-property)
for more information.

By default, the public IP of each instance will be added to the record
set.  If you would rather use the *private* IP, then add the attribute
"PrivateIP" with a true value.

Given a `resource.json` we may immediately update our resource record
sets.  `route53-controller` includes a command line script in
`./bin/update.js` which will perform the update.

```
$ node bin/update.js --resource resource.json
```

## IAM policies

Whether the resource record set update is performed at the command
line or by a lambda process, we require appropriate IAM permissions to
describe the EC2 instances and update the record sets.  

The script `./bin/create-policy.js` can create the necessary policy.
With no arguments, it will simply display the required policy.
Alternatively, it can create a policy which may be attached to roles
or users by including the `--createPolicy` option:

```
$ node bin/create-policy.js --createPolicy route53-controller
```

`./bin/create-policy.js` may also attach the policy inline to an
existing user or role by providing the `--userPolicy` or
`--rolePolicy` respectively.

```
$ node bin/create-policy.js --rolePolicy lambda_role
```

## Creating a lambda deployment

`route53-controller` will create an AWS Lambda deployment file
including a provided `resource.json` ready to be deployed to AWS
lambda.  Follow, for example, the [AWS Lambda
walkthrough](http://docs.aws.amazon.com/lambda/latest/dg/walkthrough-s3-events-adminuser-prepare.html).
Create a lambda execution role with the required `route53-controller`
IAM policy, and upload the zip file created by `./bin/lambda-package.js`.

```
$ node bin/lambda-package.js --resource resource.json
```

After uploading the lambda function, you could invoke it either with the AWS console, or via the CLI:
```
$ aws lambda invoke --region us-west-2 --function-name route53-controller  --invocation-type RequestResponse --log-type Tail  --payload '{}' lambda-output.txt
```
Make sure to invoke the function with the `region`and `function-name`
you chose.  `route53-controller` does not currently read the payload.



## Storing `resource.json` in S3

If `resource.json` must be updated frequently, it may be more
convenient to fetch `resource.json` from a static location in S3,
where it can be updated without requiring redeployment of the Lambda
function.  

The S3 location is describe by an `s3Location.json` file.  For example: 

```javascript
{
    "Bucket": "my-bucket",
    "Key": "resource.json"
}
```

The resource file may be uploaded by `./bin/upload.js`

```
$ node bin/upload.js s3Location.json resource.json
```

Now `route53-controller` requires read access to the static s3 location.
```
$ node bin/create-policy.js --s3location s3Location.json
```

Then, we may provide the `s3location.json` file in place of `resource.json`.
```
$ node bin/update.js --s3location s3Location.json
$ node bin/lambda-package.js --s3location s3Location.json
```

