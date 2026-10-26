using Microsoft.AspNetCore.Mvc;
using SportHub.Application.Services;
using SportHub.Application.DTOs;
using System.Text;
using System.Text.Json;
using System.Collections.Concurrent;

namespace SportHub.API.Controllers;

[ApiController]
[Route("api/aws-whatsapp")]
public class AwsWhatsAppWebhookController : ControllerBase
{
    private readonly AwsWhatsAppService _whatsappService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AwsWhatsAppWebhookController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly BedrockHarnessService _bedrockService;
    
    // In-memory session storage (for production, use Redis or database)
    private static readonly ConcurrentDictionary<string, UserSession> _sessions = new();

    public AwsWhatsAppWebhookController(
        AwsWhatsAppService whatsappService,
        IConfiguration configuration,
        ILogger<AwsWhatsAppWebhookController> logger,
        IHttpClientFactory httpClientFactory,
        BedrockHarnessService bedrockService)
    {
        _whatsappService = whatsappService;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _bedrockService = bedrockService;
    }

    [HttpPost("webhook")]
    [Consumes("application/json", "text/plain")]
    public async Task<IActionResult> ReceiveMessage()
    {
        try
        {
            // Read the raw body
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            
            _logger.LogInformation("Received AWS WhatsApp webhook: {Json}", body);

            var requestBody = JsonSerializer.Deserialize<JsonElement>(body);

            // Check if this is an SNS subscription confirmation
            if (requestBody.TryGetProperty("Type", out var typeElement))
            {
                var messageType = typeElement.GetString();
                
                if (messageType == "SubscriptionConfirmation")
                {
                    // Confirm SNS subscription
                    if (requestBody.TryGetProperty("SubscribeURL", out var urlElement))
                    {
                        var subscribeUrl = urlElement.GetString();
                        _logger.LogInformation("Confirming SNS subscription: {Url}", subscribeUrl);
                        
                        try
                        {
                            var httpClient = _httpClientFactory.CreateClient();
                            var response = await httpClient.GetAsync(subscribeUrl);
                            var content = await response.Content.ReadAsStringAsync();
                            
                            _logger.LogInformation("SNS Confirmation Response: Status={Status}, Body={Body}", 
                                response.StatusCode, content);
                            
                            if (response.IsSuccessStatusCode)
                            {
                                return Ok(new { status = "subscription_confirmed", message = "Success" });
                            }
                            else
                            {
                                _logger.LogError("SNS Confirmation failed: {Status} - {Body}", 
                                    response.StatusCode, content);
                                return Ok(new { status = "confirmation_failed", error = content });
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error confirming SNS subscription");
                            return Ok(new { status = "error", message = ex.Message });
                        }
                    }
                    
                    return Ok(new { status = "no_subscribe_url" });
                }
                
                // Handle SNS notification
                if (messageType == "Notification")
                {
                    if (requestBody.TryGetProperty("Message", out var messageElement))
                    {
                        var messageJson = messageElement.GetString();
                        if (string.IsNullOrEmpty(messageJson))
                        {
                            return Ok(new { status = "empty_message" });
                        }

                        // Parse the AWS Social Messaging wrapper
                        var awsWrapper = JsonSerializer.Deserialize<JsonElement>(messageJson);
                        
                        // Extract the actual WhatsApp webhook from whatsAppWebhookEntry
                        if (awsWrapper.TryGetProperty("whatsAppWebhookEntry", out var whatsappEntryElement))
                        {
                            var whatsappEntryJson = whatsappEntryElement.GetString();
                            if (!string.IsNullOrEmpty(whatsappEntryJson))
                            {
                                // Parse the WhatsApp entry JSON
                                var whatsappEntry = JsonSerializer.Deserialize<JsonElement>(whatsappEntryJson);
                                
                                // Create the expected WhatsApp webhook structure
                                var whatsappPayload = new AwsWhatsAppWebhookRequest
                                {
                                    Object = "whatsapp_business_account",
                                    Entry = new List<WhatsAppEntry>
                                    {
                                        JsonSerializer.Deserialize<WhatsAppEntry>(whatsappEntry.ToString())!
                                    }
                                };
                                
                                await ProcessWhatsAppMessage(whatsappPayload);
                            }
                        }
                    }
                }
            }
            else
            {
                // Direct webhook call (not through SNS)
                _logger.LogInformation("Processing direct webhook (not SNS)");
                
                // Check if it's AWS Social Messaging format
                if (requestBody.TryGetProperty("whatsAppWebhookEntry", out var whatsappEntryElement))
                {
                    _logger.LogInformation("Found whatsAppWebhookEntry property");
                    
                    var whatsappEntryJson = whatsappEntryElement.GetString();
                    if (!string.IsNullOrEmpty(whatsappEntryJson))
                    {
                        _logger.LogInformation("Parsing WhatsApp entry JSON: {Json}", whatsappEntryJson);
                        
                        var whatsappEntry = JsonSerializer.Deserialize<JsonElement>(whatsappEntryJson);
                        var whatsappPayload = new AwsWhatsAppWebhookRequest
                        {
                            Object = "whatsapp_business_account",
                            Entry = new List<WhatsAppEntry>
                            {
                                JsonSerializer.Deserialize<WhatsAppEntry>(whatsappEntry.ToString())!
                            }
                        };
                        
                        _logger.LogInformation("Processing WhatsApp message with {Count} entries", whatsappPayload.Entry.Count);
                        await ProcessWhatsAppMessage(whatsappPayload);
                    }
                    else
                    {
                        _logger.LogWarning("whatsAppWebhookEntry is empty");
                    }
                }
                else
                {
                    _logger.LogInformation("Not AWS Social Messaging format, trying standard format");
                    // Standard WhatsApp webhook format
                    var whatsappPayload = JsonSerializer.Deserialize<AwsWhatsAppWebhookRequest>(body);
                    if (whatsappPayload?.Entry != null && whatsappPayload.Entry.Any())
                    {
                        await ProcessWhatsAppMessage(whatsappPayload);
                    }
                }
            }

            return Ok(new { status = "ok" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing AWS WhatsApp webhook");
            return Ok(new { status = "error", message = ex.Message });
        }
    }

    private async Task ProcessWhatsAppMessage(AwsWhatsAppWebhookRequest request)
    {
        _logger.LogInformation("ProcessWhatsAppMessage called with {EntryCount} entries", request.Entry?.Count ?? 0);
        
        foreach (var entry in request.Entry ?? new List<WhatsAppEntry>())
        {
            _logger.LogInformation("Processing entry {EntryId}", entry.Id);
            
            if (entry.Changes == null || !entry.Changes.Any())
            {
                _logger.LogWarning("Entry has no changes");
                continue;
            }

            foreach (var change in entry.Changes)
            {
                _logger.LogInformation("Processing change, field: {Field}", change.Field);
                
                if (change.Value?.Messages == null || !change.Value.Messages.Any())
                {
                    _logger.LogWarning("Change has no messages");
                    continue;
                }

                foreach (var message in change.Value.Messages)
                {
                    var userMessage = message.Text?.Body ?? message.Interactive?.ButtonReply?.Title ?? "";
                    var fromNumber = message.From;

                    _logger.LogInformation("Extracted message: '{Message}' from {From}", userMessage, fromNumber);

                    if (string.IsNullOrWhiteSpace(userMessage) || string.IsNullOrWhiteSpace(fromNumber))
                    {
                        _logger.LogWarning("Message or phone number is empty");
                        continue;
                    }

                    _logger.LogInformation("Processing message from {From}: {Message}", 
                        fromNumber, userMessage);

                    // Process the message
                    var response = await ProcessMessageAsync(userMessage, fromNumber);

                    _logger.LogInformation("Generated response: {Response}", response);

                    // Send response back via AWS WhatsApp
                    var sent = await _whatsappService.SendMessageAsync(fromNumber, response);
                    
                    _logger.LogInformation("Message send result: {Success}", sent);
                }
            }
        }
    }

    [HttpGet("webhook")]
    public IActionResult VerifyWebhook([FromQuery] string hub_mode, [FromQuery] string hub_verify_token, [FromQuery] string hub_challenge)
    {
        // AWS WhatsApp webhook verification
        var verifyToken = _configuration["AWS:WhatsAppVerifyToken"] ?? "sporthub_verify_token_2024";
        
        if (hub_mode == "subscribe" && hub_verify_token == verifyToken)
        {
            _logger.LogInformation("Webhook verified successfully");
            return Content(hub_challenge, "text/plain");
        }

        _logger.LogWarning("Webhook verification failed");
        return Forbid();
    }

    private async Task<string> ProcessMessageAsync(string userMessage, string userId)
    {
        try
        {
            _logger.LogInformation("Processing message: {Message} from {User}", userMessage, userId);
            
            // Create session ID for Bedrock (must be 33+ chars)
            var sessionId = $"whatsapp-aws-{userId}".PadRight(33, '0');
            
            try
            {
                // Call Bedrock AgentCore for intelligent response
                var bedrockResponse = await _bedrockService.InvokeAsync(userMessage, sessionId);
                
                _logger.LogInformation("Bedrock response: {Response}", bedrockResponse);
                
                // Handle character limit for WhatsApp (AWS has higher limit than Twilio)
                if (bedrockResponse.Length > 4000)
                {
                    bedrockResponse = bedrockResponse.Substring(0, 4000) + 
                                     "...\n\n(Message truncated. Ask for specific details!)";
                }
                
                return bedrockResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bedrock call failed, using fallback");
                
                // Fallback to pattern matching if Bedrock fails
                return GetFallbackResponse(userMessage);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message");
            return "I'm having trouble right now. Please try again in a moment.";
        }
    }
    
    private string GetFallbackResponse(string userMessage)
    {
        var messageLower = userMessage.ToLower();
        
        if (messageLower.Contains("hi") || messageLower.Contains("hello") || messageLower.Contains("help"))
        {
            return "👋 Welcome to SportHub! I'm your AI tournament assistant.\n\n" +
                   "I can help you:\n" +
                   "• Register your team\n" +
                   "• View available events\n" +
                   "• Check your fixtures\n" +
                   "• Answer tournament questions\n\n" +
                   "Just ask me anything in natural language!";
        }
        
        return "I'm here to help with tournament registration and information. " +
               "Try asking about events, registration, or fixtures!";
    }

    // Removed old pattern matching - Bedrock handles all conversations now
}
