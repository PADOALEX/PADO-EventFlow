using System.ComponentModel.DataAnnotations;
using Pado.EventFlow.Api.Models;

namespace Pado.EventFlow.Api.Contracts;

public sealed class UpsertEventRequest : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 1)]
    public string Name { get; init; } = "";

    [StringLength(2000)]
    public string? Description { get; init; }

    [Required]
    public DateOnly? Date { get; init; }

    public TimeOnly? StartTime { get; init; }

    [Required, StringLength(160, MinimumLength = 1)]
    public string Location { get; init; } = "";

    [Required]
    public string Status { get; init; } = "Planned";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Name))
            yield return new ValidationResult("Name must not be blank.", [nameof(Name)]);
        if (string.IsNullOrWhiteSpace(Location))
            yield return new ValidationResult("Location must not be blank.", [nameof(Location)]);
        if (Date is null || Date == DateOnly.MinValue)
            yield return new ValidationResult("A valid date is required.", [nameof(Date)]);
        if (Status is not ("Planned" or "Completed"))
            yield return new ValidationResult("Status must be Planned or Completed.", [nameof(Status)]);
    }
}

public sealed record EventResponse(Guid Id, string Name, string? Description,
    DateOnly Date, TimeOnly? StartTime, string Location, string Status,
    DateTime CreatedAtUtc, DateTime UpdatedAtUtc)
{
    public static EventResponse From(Event e) => new(e.Id, e.Name, e.Description,
        e.Date, e.StartTime, e.Location, e.Status, e.CreatedAtUtc, e.UpdatedAtUtc);
}

public sealed record PageResponse<T>(IReadOnlyList<T> Items, int TotalCount, int Page,
    int PageSize, int TotalPages);
public sealed record EventStatsResponse(int Total, int Planned, int Completed);
