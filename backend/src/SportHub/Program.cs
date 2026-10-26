using Microsoft.EntityFrameworkCore;
using SportHub.Application.Interfaces;
using SportHub.Application.Services;
using SportHub.Infrastructure.Data;
using Amazon.SimpleEmail;
using Amazon.SimpleNotificationService;
using Amazon.BedrockAgentRuntime;
using Amazon.BedrockAgentCore;
using Amazon.SocialMessaging;
using Amazon.Extensions.NETCore.Setup;

var builder = WebApplication.CreateBuilder(args);

// MySQL + EF Core
var connectionString = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContext<SportHubDbContext>(opt =>
    opt.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 35)),
        mySqlOptions => mySqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)));

// Repositories
builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<IRegistrationRepository, RegistrationRepository>();
builder.Services.AddScoped<IFixtureRepository, FixtureRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddMaps(typeof(SportHub.Application.Mapping.EventProfile).Assembly));

// Application Services
builder.Services.AddScoped<EventService>();
builder.Services.AddScoped<TeamService>();
builder.Services.AddScoped<RegistrationService>();
builder.Services.AddScoped<FixtureService>();

builder.Services.AddScoped<EmailNotificationService>();
builder.Services.AddScoped<AwsWhatsAppService>();
builder.Services.AddScoped<BedrockHarnessService>();

// HTTP Client for API calls
builder.Services.AddHttpClient();

// AWS SDK Services
var awsOptions = builder.Configuration.GetAWSOptions();
awsOptions.Region = Amazon.RegionEndpoint.GetBySystemName(
    builder.Configuration["AWS:Region"] ?? "eu-west-1");

builder.Services.AddAWSService<IAmazonSimpleEmailService>(awsOptions);
builder.Services.AddAWSService<IAmazonSimpleNotificationService>(awsOptions);
builder.Services.AddAWSService<IAmazonSocialMessaging>(awsOptions);
builder.Services.AddAWSService<IAmazonBedrockAgentCore>(awsOptions);

// Bedrock Agent Runtime - may use different credentials
var bedrockAccessKey = builder.Configuration["AWS:BedrockAccessKeyId"];
var bedrockSecretKey = builder.Configuration["AWS:BedrockSecretAccessKey"];

if (!string.IsNullOrEmpty(bedrockAccessKey) && !string.IsNullOrEmpty(bedrockSecretKey))
{
    // Use separate Bedrock credentials if provided
    var bedrockOptions = new AWSOptions
    {
        Credentials = new Amazon.Runtime.BasicAWSCredentials(bedrockAccessKey, bedrockSecretKey),
        Region = Amazon.RegionEndpoint.GetBySystemName(builder.Configuration["AWS:Region"] ?? "eu-west-1")
    };
    builder.Services.AddAWSService<IAmazonBedrockAgentRuntime>(bedrockOptions);
}
else
{
    // Fall back to default credentials
    builder.Services.AddAWSService<IAmazonBedrockAgentRuntime>(awsOptions);
}

// CORS for frontend demo
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()));

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", 
                             "http://localhost:5174", 
                             "http://*.localhost:5173")
                .SetIsOriginAllowedToAllowWildcardSubdomains()
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // Required for SignalR
        });
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

// Enable CORS
app.UseCors("AllowAll");


app.UseCors();

// Health endpoint
app.MapGet("/health", () => Results.Ok(new 
{ 
    status = "Healthy", 
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName 
}));

// Database health check
app.MapGet("/health/db", async (SportHubDbContext db) =>
{
    try
    {
        await db.Database.CanConnectAsync();
        return Results.Ok(new { status = "Database Connected", timestamp = DateTime.UtcNow });
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message, statusCode: 500, title: "Database Connection Failed");
    }
});

// Root endpoint
app.MapGet("/", () => Results.Ok(new 
{
    name = "SportHub API",
    version = "1.0",
    endpoints = new[] { "/Events", "/Teams", "/Registrations", "/Fixtures", "/swagger" }
}));

app.MapControllers();
app.Run();
