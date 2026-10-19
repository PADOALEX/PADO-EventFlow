using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pado.EventFlow.Api.Contracts;
using Pado.EventFlow.Api.Data;
using Pado.EventFlow.Api.Models;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");
var origins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:5173")
    .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (origins.Length == 0 || origins.Any(o => !Uri.TryCreate(o, UriKind.Absolute, out var uri)
                                           || uri.Scheme is not ("http" or "https") || o.Contains('*')))
    throw new InvalidOperationException("AllowedOrigins must contain explicit http(s) origins.");

builder.Services.AddDbContext<EventDbContext>(options => options.UseNpgsql(connection));
builder.Services.AddProblemDetails();
builder.Services.AddCors(options => options.AddPolicy("Browser", policy => policy
    .WithOrigins(origins).WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
    .WithHeaders("Content-Type", "Accept")));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 32 * 1024);
var app = builder.Build();
app.UseExceptionHandler();
app.UseRateLimiter();
app.UseCors("Browser");

if (app.Configuration.GetValue<bool>("ApplyMigrations"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<EventDbContext>();
    await db.Database.MigrateAsync();
}

var api = app.MapGroup("/api/events");
api.MapGet("/", async Task<IResult> ([AsParameters] EventQuery q, EventDbContext db, CancellationToken ct) =>
{
    var queryError = ValidateModel(q);
    if (queryError is not null) return queryError;
    IQueryable<Event> query = db.Events.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(q.Search))
    {
        var term = q.Search.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
        query = query.Where(e => EF.Functions.ILike(e.Name, $"%{term}%", "\\")
            || (e.Description != null && EF.Functions.ILike(e.Description, $"%{term}%", "\\")));
    }
    if (q.Status is not null) query = query.Where(e => e.Status == q.Status);
    var count = await query.CountAsync(ct);
    query = (q.Sort, q.Direction) switch
    {
        ("name", "desc") => query.OrderByDescending(e => e.Name).ThenBy(e => e.Id),
        ("name", _) => query.OrderBy(e => e.Name).ThenBy(e => e.Id),
        (_, "desc") => query.OrderByDescending(e => e.Date).ThenByDescending(e => e.StartTime).ThenBy(e => e.Id),
        _ => query.OrderBy(e => e.Date).ThenBy(e => e.StartTime).ThenBy(e => e.Id)
    };
    var items = await query.Skip((int)Math.Min((long)(q.Page - 1) * q.PageSize, int.MaxValue))
        .Take(q.PageSize).Select(e => EventResponse.From(e)).ToListAsync(ct);
    return Results.Ok(new PageResponse<EventResponse>(items, count, q.Page, q.PageSize,
        (int)Math.Ceiling((double)count / q.PageSize)));
});
api.MapGet("/stats", async (EventDbContext db, CancellationToken ct) =>
{
    var total = await db.Events.CountAsync(ct);
    var planned = await db.Events.CountAsync(e => e.Status == "Planned", ct);
    return Results.Ok(new EventStatsResponse(total, planned, total - planned));
});
api.MapGet("/{id:guid}", async Task<IResult> (Guid id, EventDbContext db, CancellationToken ct) =>
{
    var item = await db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);
    return item is null ? Results.NotFound() : Results.Ok(EventResponse.From(item));
});
api.MapPost("/", async Task<IResult> (UpsertEventRequest request, EventDbContext db, CancellationToken ct) =>
{
    var error = ValidateModel(request);
    if (error is not null) return error;
    var item = NewEvent(request);
    db.Events.Add(item);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/events/{item.Id}", EventResponse.From(item));
});
api.MapPut("/{id:guid}", async Task<IResult> (Guid id, UpsertEventRequest request, EventDbContext db, CancellationToken ct) =>
{
    var error = ValidateModel(request);
    if (error is not null) return error;
    var item = await db.Events.FindAsync([id], ct);
    if (item is null) return Results.NotFound();
    Apply(item, request);
    await db.SaveChangesAsync(ct);
    return Results.Ok(EventResponse.From(item));
});
api.MapPatch("/{id:guid}/complete", async Task<IResult> (Guid id, EventDbContext db, CancellationToken ct) =>
{
    var item = await db.Events.FindAsync([id], ct);
    if (item is null) return Results.NotFound();
    item.Status = "Completed";
    item.UpdatedAtUtc = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(EventResponse.From(item));
});
api.MapDelete("/{id:guid}", async Task<IResult> (Guid id, EventDbContext db, CancellationToken ct) =>
{
    var item = await db.Events.FindAsync([id], ct);
    if (item is null) return Results.NotFound();
    db.Events.Remove(item);
    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.Run();

static IResult? ValidateModel(object request)
{
    var results = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
    if (System.ComponentModel.DataAnnotations.Validator.TryValidateObject(request,
        new System.ComponentModel.DataAnnotations.ValidationContext(request), results, true)) return null;
    var errors = results.SelectMany(result => result.MemberNames.DefaultIfEmpty("request"), (result, member) =>
            new { member, message = result.ErrorMessage ?? "Invalid field" })
        .GroupBy(item => item.member, StringComparer.OrdinalIgnoreCase)
        .ToDictionary(group => group.Key, group => group.Select(item => item.message).ToArray());
    return Results.ValidationProblem(errors);
}
static Event NewEvent(UpsertEventRequest r)
{
    var e = new Event { Name = "", Location = "", Status = "Planned" };
    Apply(e, r);
    return e;
}
static void Apply(Event e, UpsertEventRequest r)
{
    e.Name = r.Name.Trim();
    e.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
    e.Date = r.Date!.Value;
    e.StartTime = r.StartTime;
    e.Location = r.Location.Trim();
    e.Status = r.Status;
    e.UpdatedAtUtc = DateTime.UtcNow;
}

public partial class Program;
