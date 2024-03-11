import boto3
import os
import time
import re
import base64
import boto3
from langchain.prompts import PromptTemplate
from langchain.llms.bedrock import Bedrock
from botocore.config import Config
from urllib import parse
import traceback
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

from langchain_community.chat_models import BedrockChat
from langchain_core.prompts import MessagesPlaceholder, ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

bucket = os.environ.get('s3_bucket') # bucket name
s3_prefix = os.environ.get('s3_prefix')
historyTableName = os.environ.get('historyTableName')
speech_prefix = 'speech/'

s3 = boto3.client('s3')
polly = boto3.client('polly')
   
HUMAN_PROMPT = "\n\nHuman:"
AI_PROMPT = "\n\nAssistant:"

selected_LLM = 0
profile_of_LLMs = [
    {
        "bedrock_region": "us-west-2", # Oregon
        "model_type": "claude3",
        "model_id": "anthropic.claude-3-sonnet-20240229-v1:0",   
        "maxOutputTokens": "8196"
    },
    {
        "bedrock_region": "us-east-1", # N.Virginia
        "model_type": "claude3",
        "model_id": "anthropic.claude-3-sonnet-20240229-v1:0",
        "maxOutputTokens": "8196"
    }
]

def get_chat(profile_of_LLMs, selected_LLM):
    profile = profile_of_LLMs[selected_LLM]
    bedrock_region =  profile['bedrock_region']
    modelId = profile['model_id']
    print(f'LLM: {selected_LLM}, bedrock_region: {bedrock_region}, modelId: {modelId}')
    maxOutputTokens = int(profile['maxOutputTokens'])
                          
    # bedrock   
    boto3_bedrock = boto3.client(
        service_name='bedrock-runtime',
        region_name=bedrock_region,
        config=Config(
            retries = {
                'max_attempts': 30
            }            
        )
    )
    parameters = {
        "max_tokens":maxOutputTokens,     
        "temperature":0.1,
        "top_k":250,
        "top_p":0.9,
        "stop_sequences": [HUMAN_PROMPT]
    }
    # print('parameters: ', parameters)

    chat = BedrockChat(
        model_id=modelId,
        client=boto3_bedrock, 
        streaming=True,
        callbacks=[StreamingStdOutCallbackHandler()],
        model_kwargs=parameters,
    )        
    
    return chat

    
def lambda_handler(event, context):
    print(event)
    
    body = base64.b64decode(event["body"])
    header = event['multiValueHeaders']
    
    if 'content-type' in header:
        contentType = header['content-type']
    elif 'Content-Type' in header:
        contentType = header['Content-Type']
    print('contentType: ', contentType) 
    
    
    
    
    """    
    chat = get_chat(profile_of_LLMs, selected_LLM)
    
    start = int(time.time())    
    
    msg = create_greeting_message(chat, img_base64)
            
    elapsed_time = int(time.time()) - start
    print("total run time(sec): ", str(elapsed_time))
        
    print('msg: ', msg)
    speech_uri = get_text_speech(speech_prefix, bucket, msg)
    
    return {
        'statusCode': 200,
        'request_id': requestId,
        'msg': msg,
        'speech_uri': speech_uri
    }
    """
    
    return {
        'statusCode': 200,
    }
