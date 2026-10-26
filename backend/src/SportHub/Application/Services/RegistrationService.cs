using SportHub.Application.DTOs;
using SportHub.Application.Interfaces;
using SportHub.Domain.Entities;

namespace SportHub.Application.Services;

public class RegistrationService(
    IRegistrationRepository registrations, 
    ITeamRepository teams, 
    INotificationRepository notifications, 
    IEventRepository events,
    EmailNotificationService? emailService = null)
{
    public async Task<RegistrationResponse?> GetAsync(int id)
    {
        var reg = await registrations.GetByIdAsync(id);
        if (reg is null) return null;
        var team = await teams.GetByIdAsync(reg.TeamId);
        return ToResponse(reg, team);
    }

    public async Task<RegistrationResponse> CreateAsync(CreateRegistrationRequest request)
    {
        // Check registration capacity before creating
        var eventEntity = await events.GetByIdAsync(request.EventId);
        if (eventEntity == null)
            throw new ArgumentException($"Event with ID {request.EventId} not found");

        var existingRegistrations = await registrations.GetByEventIdAsync(request.EventId);
        
        // Check if team is already registered for this event
        var teamAlreadyRegistered = existingRegistrations.Any(r => r.TeamId == request.TeamId);
        if (teamAlreadyRegistered)
        {
            var team = await teams.GetByIdAsync(request.TeamId);
            throw new InvalidOperationException($"Team '{team?.Name ?? "Unknown"}' is already registered for this event");
        }
        
        // Simple capacity check - count all registrations (no status complexity)
        var currentRegistrations = existingRegistrations.Count;
        
        if (currentRegistrations >= eventEntity.NumberOfTeams)
        {
            throw new InvalidOperationException($"Registration capacity reached. Maximum teams allowed: {eventEntity.NumberOfTeams}, currently registered: {currentRegistrations}");
        }

        var reg = new Registration
        {
            EventId = request.EventId,
            TeamId = request.TeamId,
            AgeGroup = request.AgeGroup,
            Division = request.Division
        };
        await registrations.SaveAsync(reg);

        await notifications.SaveAsync(new Notification
        {
            RecipientId = request.TeamId,
            Message = $"Registration submitted for event {request.EventId}",
            Type = "Push"
        });

        var teamEntity = await teams.GetByIdAsync(request.TeamId);
        
        // Send multi-channel notifications
        if (teamEntity != null && eventEntity != null)
        {
            try
            {
                // Send email notification (if coach email is available)
                if (emailService != null && !string.IsNullOrEmpty(teamEntity.CoachEmail))
                {
                    await emailService.SendRegistrationConfirmationAsync(
                        teamEntity.CoachEmail,
                        teamEntity.Name,
                        eventEntity.Name,
                        teamEntity.CoachName
                    );
                }

                // Note: WhatsApp notifications are now handled by AWS End User Messaging Social
                // Coaches can interact with the AI bot at +27 69 674 9685
            }
            catch
            {
                // Log notification failures but don't fail the registration
            }
        }

        return ToResponse(reg, teamEntity);
    }

    public async Task<List<RegistrationResponse>> GetByEventAsync(int eventId)
    {
        var regs = await registrations.GetByEventIdAsync(eventId);
        var teamList = await teams.GetAllAsync();
        return regs.Select(reg => ToResponse(reg, teamList.FirstOrDefault(t => t.Id == reg.TeamId))).ToList();
    }

    private static RegistrationResponse ToResponse(Registration reg, Team? team) => new(
        reg.Id,
        reg.EventId,
        reg.TeamId,
        team?.Name ?? "",
        reg.AgeGroup,
        reg.Division,
        reg.Status,
        reg.RegisteredAt);
}
