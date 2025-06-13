using System;
using Xunit;

public class LicenseValidatorTests
{
    private const string TestLicenseKey = "eyJ1IjoxMjMsInMiOiJzdWJfMTIzIiwiZSI6MTY5NjE2MDAwMCwiYyI6IjEyMzQtNTY3OC05MDEyLTM0NTYifQ==.a1b2c3d4e5f6g7h8i9j0";

    [Fact]
    public void ValidateOffline_ValidKey_ReturnsValidResult()
    {
        // Arrange
        Environment.SetEnvironmentVariable("LICENSE_SECRET", "test-secret");

        // Act
        var result = LicenseValidator.ValidateOffline(TestLicenseKey);

        // Assert
        Assert.True(result.Valid);
        Assert.Equal(123, result.UserId);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);
        Assert.True(result.IsOffline);
    }

    [Fact]
    public void ValidateOffline_InvalidSignature_ReturnsInvalid()
    {
        // Arrange
        Environment.SetEnvironmentVariable("LICENSE_SECRET", "wrong-secret");

        // Act
        var result = LicenseValidator.ValidateOffline(TestLicenseKey);

        // Assert
        Assert.False(result.Valid);
        Assert.Equal("Invalid signature", result.Reason);
    }

    [Fact]
    public void ValidateOffline_ExpiredKey_ReturnsExpired()
    {
        // Arrange
        var expiredKey = "eyJ1IjoxMjMsInMiOiJzdWJfMTIzIiwiZSI6MTY5NjE2MDAwMCwiYyI6IjEyMzQtNTY3OC05MDEyLTM0NTYifQ==.a1b2c3d4e5f6g7h8i9j0";
        Environment.SetEnvironmentVariable("LICENSE_SECRET", "test-secret");

        // Act
        var result = LicenseValidator.ValidateOffline(expiredKey);

        // Assert
        Assert.False(result.Valid);
        Assert.Equal("License expired", result.Reason);
    }

    [Fact]
    public void ValidateOffline_MalformedKey_ReturnsInvalid()
    {
        // Act
        var result = LicenseValidator.ValidateOffline("invalid.key.format");

        // Assert
        Assert.False(result.Valid);
        Assert.Equal("Validation failed", result.Reason);
    }
}