# Bedrock AgentCore Harness Integration

## Architecture

Your multi-channel bot (WhatsApp + Web Chat) uses Bedrock AgentCore Harness for intelligent, conversational responses:

```
WhatsApp User → AWS End User Messaging Social → SNS → C# API → Lambda (Python) → Bedrock Harness → Gateway → Your API Tools
Web Chat User → C# API (ChatController) → Lambda (Python) → Bedrock Harness → Gateway → Your API Tools
```

## Components

### 1. Lambda Bedrock Proxy (`lambda_function.py`)
- Deployed as AWS Lambda function
- Handles `invoke_harness` calls using boto3
- Manages session IDs (min 33 chars required by AWS)
- Streams responses from Bedrock AgentCore

### 2. C# Service (`BedrockHarnessService.cs`)
- Calls Lambda via HTTP
- Maintains session per user (WhatsApp phone number or web session ID)
- Returns intelligent responses to both WhatsApp and web chat

### 3. Bedrock AgentCore Harness
- **ARN:** `arn:aws:bedrock-agentcore:eu-west-1:262683589693:harness/amusema_sports_agent-Azjer58UxL`
- **Model:** Claude Sonnet 4.6 (global profile, Converse API)
- **Memory:** Harness-managed (semantic + summarization)
- **Gateway:** Calls your SportHub API tools (events, registrations, fixtures, teams)
- **IAM Role:** `BedrockAgentRole` with Bedrock and Gateway permissions

## Deploying Lambda Function

### Prerequisites
- AWS CLI configured (`aws configure`)
- Lambda execution role with `bedrock-agentcore:InvokeHarness` permission

### Deploy Steps

```bash
cd backend
./deploy_lambda.sh
```

This script:
1. Creates Python virtual environment
2. Installs boto3 dependencies
3. Packages `lambda_function.py`
4. Uploads to AWS Lambda

### Lambda Configuration
- **Runtime:** Python 3.12
- **Handler:** `lambda_function.lambda_handler`
- **Timeout:** 60 seconds (for Bedrock streaming)
- **Memory:** 256 MB
- **Environment Variables:** None (uses IAM role for AWS credentials)

### Expose Lambda
Create a Lambda Function URL or API Gateway endpoint, then set in your .NET backend:

```bash
# In Render or local environment
export Bedrock__PythonServiceUrl="https://your-lambda-url.execute-api.eu-west-1.amazonaws.com"
```

## Testing

### Test Lambda Directly
```bash
# If using Lambda Function URL
curl -X POST https://your-lambda-url.execute-api.eu-west-1.amazonaws.com \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "test123"}'
```

### Test WhatsApp Channel
Send message to **+27 69 674 9685**:
```
"hi"
"I want to register my team"
"actually, show me fixtures first"
```

### Test Web Chat Channel
In Swagger (`https://sporthub-rng4.onrender.com/swagger`), use `POST /api/Chat/invoke`:
```json
{
  "message": "hi",
  "sessionId": "web-test-123"
}
```

The bot should understand context and corrections across both channels!

## Key Features

✅ **Multi-channel** - Works on both WhatsApp and Web Chat  
✅ **Conversational** - Understands natural language  
✅ **Context-aware** - Remembers conversation per session  
✅ **Handles corrections** - "Actually, my team name is wrong"  
✅ **Task switching** - "Cancel, show fixtures instead"  
✅ **Uses your API** - Via AgentCore Gateway with tool definitions

## Session Management

**WhatsApp Sessions:**
- Session ID format: `whatsapp-aws-{phoneNumber}` (padded to 33+ chars)
- Persistent per phone number
- Example: `whatsapp-aws-27696749685000000000000000000`

**Web Chat Sessions:**
- Session ID format: `web-chat-{customId}` (padded to 33+ chars)
- Persistent per provided session ID
- Example: `web-chat-user123000000000000000000000000`

Bedrock AgentCore manages conversation history automatically for each session.

## Troubleshooting

**Error: "BedrockAgentCore object has no attribute 'invoke_harness'"**
- Solution: Ensure boto3 is updated in Lambda layer: `pip install --upgrade boto3 botocore`

**Error: "Session ID must be at least 33 characters"**
- Solution: Already handled in code with padding (`.PadRight(33, '0')`)

**Empty or no responses**
- Check Lambda CloudWatch logs for errors
- Verify Lambda IAM role has `bedrock-agentcore:InvokeHarness` permission
- Verify Harness ARN is correct in Lambda code
- Check `Bedrock__PythonServiceUrl` points to correct Lambda URL
- Ensure `BedrockAgentRole` has Bedrock model access and Gateway permissions

**Gateway tool calls fail**
- Verify Gateway target URL is reachable from AWS
- Check backend API is awake (Render free tier sleeps after 30 min)
- Review Gateway configuration in Bedrock console

**WhatsApp not responding**
- Check SNS subscription is "Confirmed"
- Verify Event Destination points to correct SNS topic
- Check backend webhook at `/api/aws-whatsapp/webhook` is accessible

## Architecture Diagram

```
┌─────────────────┐
│  WhatsApp User  │
└────────┬────────┘
         │
         v
┌───────────────────────────┐
│ AWS End User Messaging    │
│ Social (WhatsApp)         │
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐
│ Amazon SNS                │
│ (Event Destination)       │
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐      ┌─────────────────┐
│ .NET Backend API          │◄─────│  Web Chat User  │
│ (Render)                  │      └─────────────────┘
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐
│ AWS Lambda                │
│ (Python 3.12)             │
│ Bedrock Proxy             │
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐
│ Bedrock AgentCore         │
│ Harness                   │
│ - Claude Sonnet 4.6       │
│ - Memory                  │
│ - Gateway                 │
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐
│ AgentCore Gateway         │
│ (Tool Access)             │
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐
│ .NET API Tools            │
│ - GET /api/Events         │
│ - POST /api/Registrations │
│ - GET /api/Fixtures       │
└────────┬──────────────────┘
         │
         v
┌───────────────────────────┐
│ AWS RDS MySQL             │
│ (eu-west-1)               │
└───────────────────────────┘
```
