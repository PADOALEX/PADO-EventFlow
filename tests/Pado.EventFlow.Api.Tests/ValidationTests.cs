using System.ComponentModel.DataAnnotations;
using Pado.EventFlow.Api.Contracts;
using Pado.EventFlow.Api.Models;
using Xunit;

namespace Pado.EventFlow.Api.Tests;

public sealed class ValidationTests
{
    [Theory]
    [InlineData("", "Lviv", "Planned")]
    [InlineData("Event", " ", "Planned")]
    [InlineData("Event", "Lviv", "Cancelled")]
    public void Invalid_event_payload_fails_validation(string name, string location, string status)
    {
        var request = new UpsertEventRequest { Name = name, Location = location,
            Date = new DateOnly(2026, 11, 5), Status = status };
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), new List<ValidationResult>(), true));
    }

    [Fact]
    public void Valid_event_passes_validation()
    {
        var request = new UpsertEventRequest { Name = "Workshop", Location = "Lviv",
            Date = new DateOnly(2026, 11, 5), Status = "Planned" };
        Assert.True(Validator.TryValidateObject(request, new ValidationContext(request), new List<ValidationResult>(), true));
    }

    [Theory]
    [InlineData("bogus", "asc", 1, 10)]
    [InlineData("date", "up", 1, 10)]
    [InlineData("date", "asc", 0, 10)]
    [InlineData("date", "asc", 1, 101)]
    public void Invalid_query_fails_validation(string sort, string direction, int page, int pageSize)
    {
        var query = new EventQuery { Sort = sort, Direction = direction, Page = page, PageSize = pageSize };
        Assert.False(Validator.TryValidateObject(query, new ValidationContext(query), new List<ValidationResult>(), true));
    }
}
