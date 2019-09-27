import {SQS, config} from 'aws-sdk';
import {
    Container,
    Injectable,
    LambdaConfig,
    LambdaGlobalContext,
    LambdaHttpRequest,
    LambdaHttpResposne,
    LambdaSqsRequest, Module
} from "aws-lambda-helper/dist";
import {LambdaHttpHandler, LambdaSqsHandler} from "aws-lambda-helper/dist/HandlerFactory";

// Once registered this is the handler code for lambda_template
export async function handler(event: any, context: any) {
    const container = await LambdaGlobalContext.container();

    await container.registerModule(new MyLambdaModule()); // Change this to your defined module

    const lgc = container.get<LambdaGlobalContext>(LambdaGlobalContext);
    return await lgc.handleAsync(event, context);
}

// Implement your specific handlers in a separate file
export class EchoHttpHandler implements LambdaHttpHandler {
    async handle(request: LambdaHttpRequest, context: any): Promise<LambdaHttpResposne> {
        return {
            body: 'You did actually say ' + request.queryStringParameters['message'],
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/html',
            },
            statusCode: 200,
        } as LambdaHttpResposne
    }
}

// Implement your specific handlers in a separate file
export class PingPongSqsHandler implements LambdaSqsHandler, Injectable {
    constructor(private lambdaConfig: LambdaConfig, private sqs: SQS) {
    }

    async handle(request: LambdaSqsRequest, context: any) {
        const rec = request.Records[0];
        // @ts-ignore
        console.log('Received SQS message ', rec);
        const { message, count } = JSON.parse(rec.body) as any;
        if (!message || !count) {
            // @ts-ignore
            console.error('PingPongSqsHandler.handle', request);
            throw new Error('No message found in the SQS request');
        }

        if (count > 10) {
            console.log('Already submitted 10 messages. Time to end the party!');
            return;
        }

        config.update({region: rec.awsRegion});
        await this.sqs.sendMessage({
            DelaySeconds: 2,
            QueueUrl: this.lambdaConfig.sqsQueueUrl!,
            MessageBody: JSON.stringify({ message: message === 'ping' ? 'pong' : 'ping', count: count + 1 }),
        }, (r: any) => r).promise();
    }

    __name__(): string {
        return 'PingPongSqsHandler';
    }
}

export class MyLambdaModule implements Module {
    async configAsync(container: Container) {
        container.register('LambdaHttpHandler', () => new EchoHttpHandler());
        container.register("LambdaSqsHandler",
                c => new PingPongSqsHandler(c.get(LambdaConfig), c.get('SQS')));
    }
}
