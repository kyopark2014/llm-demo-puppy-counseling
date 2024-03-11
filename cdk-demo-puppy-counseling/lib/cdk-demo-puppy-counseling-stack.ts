import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as rekognition from 'aws-cdk-lib/aws-rekognition';

const region = process.env.CDK_DEFAULT_REGION;    
const debug = false;
const stage = 'dev';
const s3_prefix = 'docs';
const projectName = `demo-puppy-counseling`; 
const bucketName = `storage-for-${projectName}-${region}`; 

export class CdkDemoPuppyCounselingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // s3 
    const s3Bucket = new s3.Bucket(this, `storage-${projectName}`,{
      bucketName: bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      versioned: false,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
        },
      ],
    });
    if(debug) {
      new cdk.CfnOutput(this, 'bucketName', {
        value: s3Bucket.bucketName,
        description: 'The nmae of bucket',
      });
      new cdk.CfnOutput(this, 's3Arn', {
        value: s3Bucket.bucketArn,
        description: 'The arn of s3',
      });
      new cdk.CfnOutput(this, 's3Path', {
        value: 's3://'+s3Bucket.bucketName,
        description: 'The path of s3',
      });
    }

    // copy web application files into s3 bucket
    new s3Deploy.BucketDeployment(this, `upload-HTML-for-${projectName}`, {
      sources: [s3Deploy.Source.asset("../html/")],
      destinationBucket: s3Bucket,
    });        
    new cdk.CfnOutput(this, 'HtmlUpdateCommend', {
      value: 'aws s3 cp ../html/ ' + 's3://' + s3Bucket.bucketName + '/ --recursive',
      description: 'copy commend for web pages',
    });

    // cloudfront
    const distribution = new cloudFront.Distribution(this, `cloudfront-for-${projectName}`, {
      defaultBehavior: {
        origin: new origins.S3Origin(s3Bucket),
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      priceClass: cloudFront.PriceClass.PRICE_CLASS_200,  
    });
    new cdk.CfnOutput(this, `distributionDomainName-for-${projectName}`, {
      value: distribution.domainName,
      description: 'The domain name of the Distribution',
    });

    // collection of rekognition
    const collectionId = `collectionId-for-${projectName}`;
    const cfnCollection = new rekognition.CfnCollection(this, 'MyCfnCollection', {
      collectionId: collectionId,
    });
    if (debug) {
      new cdk.CfnOutput(this, 'Collection-attrArn', {
        value: cfnCollection.attrArn,
        description: 'The arn of correction in Rekognition',
      }); 
    }

    // API Gateway
    const role = new iam.Role(this, `api-role-for-${projectName}`, {
      roleName: `api-role-for-${projectName}`,
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com")
    });
    role.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['lambda:InvokeFunction']
    }));
    role.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaExecute',
    });
    
    const api = new apiGateway.RestApi(this, `api-gw-for-${projectName}`, {
      description: `API Gateway for ${projectName}`,
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      binaryMediaTypes: ['*/*'],
      deployOptions: {
        stageName: stage,

        // logging for debug
        // loggingLevel: apiGateway.MethodLoggingLevel.INFO,
        // dataTraceEnabled: true,
      },
    });

    const lambdaGreeting= new lambda.Function(this, `lambda-greeting-for-${projectName}`, {
      description: 'lambda for greeting message',
      functionName: `lambda-greeting-${projectName}`,
      handler: 'lambda_function.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-greeting')),
      timeout: cdk.Duration.seconds(30),
      environment: {
      }
    });
  
    // POST method - greeting
    const greeting_info = api.root.addResource("greeting");
    greeting_info.addMethod('POST', new apiGateway.LambdaIntegration(lambdaGreeting, {
        passthroughBehavior: apiGateway.PassthroughBehavior.WHEN_NO_TEMPLATES,
        credentialsRole: role,
        integrationResponses: [{
            statusCode: '200',
        }],
        proxy: false,
    }), {
        methodResponses: [
            {
                statusCode: '200',
                responseModels: {
                    'application/json': apiGateway.Model.EMPTY_MODEL,
                },
            }
        ]
    });
    
    distribution.addBehavior("/greeting", new origins.RestApiOrigin(api), {
        cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudFront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    });
    s3Bucket.grantReadWrite(lambdaGreeting);

    const RekognitionPolicy = new iam.PolicyStatement({
      actions: ['rekognition:*'],
      resources: ['*'],
    });
    lambdaGreeting.role?.attachInlinePolicy(
      new iam.Policy(this, 'rekognition-policy', {
        statements: [RekognitionPolicy],
      }),
    );    

    const roleLambda = new iam.Role(this, `role-lambda-chat-for-${projectName}`, {
      roleName: `role-lambda-chat-for-${projectName}-${region}`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("bedrock.amazonaws.com"),
      )
    });
    roleLambda.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    });
    const BedrockPolicy = new iam.PolicyStatement({  // policy statement for sagemaker
      resources: ['*'],
      actions: ['bedrock:*'],
    });        
    roleLambda.attachInlinePolicy( // add bedrock policy
      new iam.Policy(this, `bedrock-policy-lambda-chat-for-${projectName}`, {
        statements: [BedrockPolicy],
      }),
    );      

    new cdk.CfnOutput(this, 'Enabler', {
      value: 'https://' + distribution.domainName + '/enabler.html',
      description: 'url of enabler',
    });     

  }
}
