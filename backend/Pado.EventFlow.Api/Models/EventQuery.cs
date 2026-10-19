using System.ComponentModel.DataAnnotations;

namespace Pado.EventFlow.Api.Models;

public sealed class EventQuery : IValidatableObject
{
    [StringLength(120)]
    public string? Search { get; init; }
    public string? Status { get; init; }
    public string Sort { get; init; } = "date";
    public string Direction { get; init; } = "asc";
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;
    [Range(1, 100)]
    public int PageSize { get; init; } = 10;

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Status is not (null or "Planned" or "Completed"))
            yield return new ValidationResult("Invalid status.", [nameof(Status)]);
        if (Sort is not ("date" or "name"))
            yield return new ValidationResult("Sort must be date or name.", [nameof(Sort)]);
        if (Direction is not ("asc" or "desc"))
            yield return new ValidationResult("Direction must be asc or desc.", [nameof(Direction)]);
    }
}
