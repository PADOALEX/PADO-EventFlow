using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Pado.EventFlow.Api.Contracts;
using Xunit;

namespace Pado.EventFlow.Api.Tests;

// Requires EVENTFLOW_TEST_CONNECTION with a dedicated, disposable PostgreSQL database.
public sealed class EventsIntegrationTests
{
    [Fact]
    public async Task Create_query_complete_delete_round_trip()
    {
        var connection = Environment.GetEnvironmentVariable("EVENTFLOW_TEST_CONNECTION");
        if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Set EVENTFLOW_TEST_CONNECTION for PostgreSQL integration tests.");
        await using var factory = new EventFlowFactory(connection);
        using var client = factory.CreateClient();
        var name = "Integration " + Guid.NewGuid().ToString("N");
        var input = new UpsertEventRequest { Name = name, Date = new DateOnly(2026, 12, 5),
            Location = "Lviv", Status = "Planned", Description = "CI-created event" };
        var created = await client.PostAsJsonAsync("/api/events", input);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var item = await created.Content.ReadFromJsonAsync<EventResponse>();
        Assert.NotNull(item);
        Assert.Equal(name, item.Name);
        var list = await client.GetFromJsonAsync<PageResponse<EventResponse>>(
            "/api/events?search=" + Uri.EscapeDataString(name) + "&status=Planned&pageSize=5");
        Assert.NotNull(list);
        Assert.Contains(list.Items, e => e.Id == item.Id);
        var completed = await client.PatchAsync($"/api/events/{item.Id}/complete", null);
        Assert.Equal(HttpStatusCode.OK, completed.StatusCode);
        var deleted = await client.DeleteAsync($"/api/events/{item.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/events/{item.Id}")).StatusCode);
    }

    [Fact]
    public async Task Invalid_payload_and_query_return_400()
    {
        var connection = Environment.GetEnvironmentVariable("EVENTFLOW_TEST_CONNECTION");
        if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Set EVENTFLOW_TEST_CONNECTION for PostgreSQL integration tests.");
        await using var factory = new EventFlowFactory(connection);
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/events",
            new UpsertEventRequest { Name = " ", Date = new DateOnly(2026, 12, 5), Location = "Lviv", Status = "Planned" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/events?pageSize=999")).StatusCode);
    }

    private sealed class EventFlowFactory(string connection) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Postgres"] = connection,
                    ["AllowedOrigins"] = "http://localhost:5173",
                    ["ApplyMigrations"] = "true"
                }));
        }
    }
}
