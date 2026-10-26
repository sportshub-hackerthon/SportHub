using System.Globalization;
using AutoMapper;
using SportHub.Application.DTOs;
using SportHub.Application.Interfaces;
using SportHub.Domain.Entities;

namespace SportHub.Application.Services;

public class FixtureService
{
    private readonly IFixtureRepository fixtures;
    private readonly IRegistrationRepository registrations;
    private readonly IEventRepository events;
    private readonly ITeamRepository teams;

    public FixtureService(
        IFixtureRepository fixtures,
        IRegistrationRepository registrations,
        IEventRepository events,
        ITeamRepository teams)
    {
        this.fixtures = fixtures;
        this.registrations = registrations;
        this.events = events;
        this.teams = teams;
    }

    public async Task<List<FixtureResponse>> GetByEventAsync(int eventId)
    {
        var fixtureList = await fixtures.GetByEventIdAsync(eventId);
        var teamList = await teams.GetAllAsync();
        var registrationList = await registrations.GetByEventIdAsync(eventId);
        
        return fixtureList.Select(f => ToResponse(f, teamList, registrationList)).ToList();
    }

    public async Task<List<FixtureResponse>> GenerateAsync(GenerateFixturesRequest request)
    {
        // DEBUG LOG
        Console.WriteLine($"[DEBUG] GenerateAsync called with EventId={request.EventId}, PitchId={request.PitchId}");
        
        var ev = await events.GetByIdAsync(request.EventId);
        if (ev is null) return [];

        var regs = await registrations.GetByEventIdAsync(request.EventId);
        var teamList = await teams.GetAllAsync();

        // 1. CHECK CAPACITY: Wait for max capacity before generating fixtures
        var confirmedRegistrations = regs.Where(r => r.Status == "Confirmed").ToList();
        if (confirmedRegistrations.Count < ev.NumberOfTeams)
        {
            throw new InvalidOperationException($"Cannot generate fixtures yet. Waiting for full capacity: {confirmedRegistrations.Count}/{ev.NumberOfTeams} teams registered. Please wait for more teams to register.");
        }



        // 2. CHECK FOR EXISTING FIXTURES: Prevent duplicate generation
        var existingFixtures = await fixtures.GetByEventIdAsync(request.EventId);
        if (existingFixtures.Any())
        {
            throw new InvalidOperationException($"Fixtures already exist for this event. Found {existingFixtures.Count} existing fixtures. Delete them first if you want to regenerate.");
        }

        // 3. Auto-assign divisions if not specified
        await AutoAssignDivisions(regs, request.EventId);
        regs = await registrations.GetByEventIdAsync(request.EventId);

        // 4. Group teams by age group and division
        var teamsByAgeAndDivision = new Dictionary<string, List<int>>();
        foreach (var reg in confirmedRegistrations)
        {
            var key = $"{reg.AgeGroup}-{reg.Division}";
            if (!teamsByAgeAndDivision.ContainsKey(key))
                teamsByAgeAndDivision[key] = new List<int>();
            teamsByAgeAndDivision[key].Add(reg.TeamId);
        }



        // 5. Generate smart fixtures with all constraints
        var generated = await GenerateSmartFixtures(teamsByAgeAndDivision, ev, request.PitchId);

        // 6. Save all fixtures
        foreach (var fixture in generated)
        {
            await fixtures.SaveAsync(fixture);
        }

        // Note: WhatsApp notifications are now handled by AWS End User Messaging Social
        // Coaches can interact with the AI bot at +27 69 674 9685 to check fixtures

        return generated.Select(f => ToResponse(f, teamList, regs)).ToList();
    }

    private Task<List<Fixture>> GenerateSmartFixtures(Dictionary<string, List<int>> teamsByAgeAndDivision, Event ev, int pitchId)
    {
        // DEBUG LOG
        Console.WriteLine($"[DEBUG] GenerateSmartFixtures called with pitchId={pitchId}");
        
        var fixtures = new List<Fixture>();
        var startMinutes = TimeSpan.Parse(ev.PitchStartTime, CultureInfo.InvariantCulture).TotalMinutes;
        var endMinutes = TimeSpan.Parse(ev.PitchEndTime, CultureInfo.InvariantCulture).TotalMinutes;
        var matchDuration = ev.MatchDurationMinutes;
        var breakBetweenMatches = ev.BreakBetweenMatchesMinutes;
        var maxMatchesPerTeam = ev.MaxMatchesPerTeam;
        var minRestTime = ev.MinRestTimeBetweenMatches;

        // Track team schedule to prevent back-to-back matches and manage pitch usage
        var teamSchedule = new Dictionary<int, List<double>>(); // teamId -> list of match start times
        var pitchSchedule = new List<(double start, double end)>(); // track pitch usage times
        


        var currentSlotStart = startMinutes;

        // Generate fixtures for each division
        foreach (var (groupKey, teamIds) in teamsByAgeAndDivision)
        {
            if (teamIds.Count < 2)
            {
                continue;
            }

            // Initialize team schedules
            foreach (var teamId in teamIds)
            {
                if (!teamSchedule.ContainsKey(teamId))
                    teamSchedule[teamId] = new List<double>();
            }

            // Generate all possible matchups
            var allMatchups = new List<(int home, int away)>();
            for (int i = 0; i < teamIds.Count; i++)
            {
                for (int j = i + 1; j < teamIds.Count; j++)
                {
                    allMatchups.Add((teamIds[i], teamIds[j]));
                }
            }



            // Shuffle for fairness
            var random = new Random();
            allMatchups = allMatchups.OrderBy(x => random.Next()).ToList();

            // Schedule matches with smart constraints
            foreach (var (home, away) in allMatchups)
            {
                // Check if teams have reached max matches
                if (teamSchedule[home].Count >= maxMatchesPerTeam || teamSchedule[away].Count >= maxMatchesPerTeam)
                {
                    continue;
                }

                // Find next available slot that satisfies all constraints
                var matchSlot = FindNextAvailableSlot(
                    currentSlotStart, 
                    endMinutes,
                    matchDuration,
                    breakBetweenMatches,
                    minRestTime,
                    teamSchedule,
                    pitchSchedule,
                    home,
                    away,
                    pitchId
                );

                if (matchSlot == -1)
                {
                    continue;
                }

                // Schedule the match
                var kickOff = TimeSpan.FromMinutes(matchSlot).ToString(@"hh\:mm");
                var matchEnd = matchSlot + matchDuration;

                var fixture = new Fixture
                {
                    EventId = ev.Id,
                    HomeTeamId = home,
                    AwayTeamId = away,
                    PitchId = pitchId,
                    KickOffTime = kickOff
                };

                // DEBUG LOG
                Console.WriteLine($"[DEBUG] Creating fixture: EventId={ev.Id}, HomeTeam={home}, AwayTeam={away}, PitchId={pitchId}, KickOff={kickOff}");

                fixtures.Add(fixture);

                // Update schedules
                teamSchedule[home].Add(matchSlot);
                teamSchedule[away].Add(matchSlot);
                pitchSchedule.Add((matchSlot, matchEnd + breakBetweenMatches)); // Include cleanup time
                
                // Don't update currentSlotStart here - let the algorithm find available slots
                // This allows fixtures from different age groups to be interleaved
            }
        }

        return Task.FromResult(fixtures);
    }

    private double FindNextAvailableSlot(
        double startTime,
        double endTime,
        int matchDuration,
        int breakBetweenMatches,
        int minRestTime,
        Dictionary<int, List<double>> teamSchedule,
        List<(double start, double end)> pitchSchedule,
        int homeTeamId,
        int awayTeamId,
        int pitchId)
    {
        var slotDuration = matchDuration + breakBetweenMatches;
        
        for (double slot = startTime; slot + matchDuration <= endTime; slot += 15) // 15-minute increments
        {
            var slotEnd = slot + matchDuration;
            var slotWithBreak = slot + slotDuration;

            // 1. CHECK PITCH AVAILABILITY: Ensure pitch is not double-booked
            var pitchConflict = pitchSchedule.Any(p => 
                (slot >= p.start && slot < p.end) || 
                (slotEnd > p.start && slotEnd <= p.end) ||
                (slot <= p.start && slotEnd >= p.end));

            if (pitchConflict)
                continue;

            // 2. CHECK TEAM REST TIME: Ensure teams have adequate rest
            var homeTeamCanPlay = CanTeamPlay(homeTeamId, slot, slotEnd, minRestTime, teamSchedule, matchDuration);
            var awayTeamCanPlay = CanTeamPlay(awayTeamId, slot, slotEnd, minRestTime, teamSchedule, matchDuration);

            if (!homeTeamCanPlay || !awayTeamCanPlay)
                continue;

            // Found a valid slot!
            return slot;
        }

        return -1; // No available slot found
    }

    private bool CanTeamPlay(int teamId, double newMatchStart, double newMatchEnd, int minRestTime, Dictionary<int, List<double>> teamSchedule, int matchDuration)
    {
        if (!teamSchedule.ContainsKey(teamId) || !teamSchedule[teamId].Any())
            return true; // Team has no previous matches

        var teamMatches = teamSchedule[teamId];

        // Check rest time before this match
        // Rest time should be measured from the END of the last match to the START of this match
        var lastMatchStart = teamMatches.Max();
        var lastMatchEnd = lastMatchStart + matchDuration;
        
        if (newMatchStart < lastMatchEnd + minRestTime)
        {
            return false;
        }

        // Check rest time after this match (if there are future matches)
        var earliestNextMatchStart = teamMatches.Where(m => m > newMatchEnd).DefaultIfEmpty(double.MaxValue).Min();
        if (earliestNextMatchStart < newMatchEnd + minRestTime)
        {
            return false;
        }

        return true;
    }

    private async Task AutoAssignDivisions(List<Registration> registrationList, int eventId)
    {
        // Group by age group first
        var regsByAgeGroup = registrationList
            .Where(r => string.IsNullOrEmpty(r.Division))
            .GroupBy(r => r.AgeGroup)
            .ToList();

        foreach (var ageGroupRegs in regsByAgeGroup)
        {
            var regsInAge = ageGroupRegs.ToList();
            
            // If we have enough teams for divisions (at least 6), create balanced divisions
            if (regsInAge.Count >= 6)
            {
                // Randomize order first for fair distribution
                var random = new Random();
                var shuffledRegs = regsInAge.OrderBy(x => random.Next()).ToList();
                
                var halfCount = shuffledRegs.Count / 2;
                
                // Assign Division A to first half, Division B to second half
                for (int i = 0; i < shuffledRegs.Count; i++)
                {
                    var reg = shuffledRegs[i];
                    reg.Division = i < halfCount ? "A" : "B";
                    await registrations.SaveAsync(reg);
                }
            }
            else
            {
                // Too few teams for divisions, put all in Division A
                foreach (var reg in regsInAge)
                {
                    reg.Division = "A";
                    await registrations.SaveAsync(reg);
                }
            }
        }
    }



    public async Task<FixtureResponse?> CreateAsync(CreateFixtureRequest request)
    {
        // Validate fixture fits within pitch window
        var eventEntity = await events.GetByIdAsync(request.EventId);
        if (eventEntity == null)
            throw new ArgumentException($"Event with ID {request.EventId} not found");

        try
        {
            var kickOff = TimeSpan.Parse(request.KickOffTime, CultureInfo.InvariantCulture);
            var pitchStart = TimeSpan.Parse(eventEntity.PitchStartTime, CultureInfo.InvariantCulture);
            var pitchEnd = TimeSpan.Parse(eventEntity.PitchEndTime, CultureInfo.InvariantCulture);
            var matchEnd = kickOff.Add(TimeSpan.FromMinutes(eventEntity.MatchDurationMinutes));

            if (kickOff < pitchStart || matchEnd > pitchEnd)
            {
                throw new ArgumentException($"Fixture (kick-off: {request.KickOffTime}, duration: {eventEntity.MatchDurationMinutes}min) does not fit within pitch availability ({eventEntity.PitchStartTime} - {eventEntity.PitchEndTime})");
            }
        }
        catch (FormatException)
        {
            throw new ArgumentException($"Invalid kick-off time format: {request.KickOffTime}. Expected H:mm or HH:mm format (e.g., 8:00 or 08:00)");
        }

        var fixture = new Fixture
        {
            EventId = request.EventId,
            HomeTeamId = request.HomeTeamId,
            AwayTeamId = request.AwayTeamId,
            PitchId = request.PitchId,
            KickOffTime = request.KickOffTime
        };

        await fixtures.SaveAsync(fixture);
        var teamList = await teams.GetAllAsync();
        var eventRegistrations = await registrations.GetByEventIdAsync(request.EventId);
        return ToResponse(fixture, teamList, eventRegistrations);
    }

    private static FixtureResponse ToResponse(Fixture f, List<Team> teamList, List<Registration> registrationList)
    {
        // Find the registration for the home team to get division and age group info
        var homeTeamReg = registrationList.FirstOrDefault(r => r.TeamId == f.HomeTeamId);
        
        return new(
            f.Id,
            f.EventId,
            f.HomeTeamId,
            teamList.FirstOrDefault(t => t.Id == f.HomeTeamId)?.Name ?? "",
            f.AwayTeamId,
            teamList.FirstOrDefault(t => t.Id == f.AwayTeamId)?.Name ?? "",
            f.PitchId,
            f.KickOffTime,
            f.Status,
            homeTeamReg?.AgeGroup ?? "",
            homeTeamReg?.Division ?? ""
        );
    }
}
