using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Pado.EventFlow.Api.Data;
using Pado.EventFlow.Api.Models;

#nullable disable
namespace Pado.EventFlow.Api.Migrations;

[DbContext(typeof(EventDbContext))]
public sealed class EventDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.0");
        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events", table => table.HasCheckConstraint("ck_events_status", "status IN ('Planned', 'Completed')"));
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(2000);
            entity.Property(e => e.Date).HasColumnName("date").HasColumnType("date");
            entity.Property(e => e.StartTime).HasColumnName("start_time").HasColumnType("time without time zone");
            entity.Property(e => e.Location).HasColumnName("location").HasMaxLength(160).IsRequired();
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(16).IsRequired();
            entity.Property(e => e.CreatedAtUtc).HasColumnName("created_at_utc").HasColumnType("timestamp with time zone");
            entity.Property(e => e.UpdatedAtUtc).HasColumnName("updated_at_utc").HasColumnType("timestamp with time zone");
            entity.HasIndex(e => new { e.Date, e.Id });
            entity.HasIndex(e => e.Status);
        });
    }
}
