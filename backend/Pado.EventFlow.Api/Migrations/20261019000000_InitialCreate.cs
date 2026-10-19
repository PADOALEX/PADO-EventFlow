using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Pado.EventFlow.Api.Data;

#nullable disable
namespace Pado.EventFlow.Api.Migrations;

[DbContext(typeof(EventDbContext))]
[Migration("20261019000000_InitialCreate")]
public sealed class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "events",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                date = table.Column<DateOnly>(type: "date", nullable: false),
                start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                location = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_events", x => x.id);
                table.CheckConstraint("ck_events_status", "status IN ('Planned', 'Completed')");
            });
        migrationBuilder.CreateIndex(name: "IX_events_date_id", table: "events", columns: ["date", "id"]);
        migrationBuilder.CreateIndex(name: "IX_events_status", table: "events", column: "status");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "events");
}
