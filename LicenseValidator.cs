using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

public class LicenseValidationResult
{
    public bool Valid { get; set; }
    public string Reason { get; set; }
    public int? UserId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsOffline { get; set; }
}

public class LicensePayload
{
    public int u { get; set; } // User ID
    public string s { get; set; } // Subscription ID
    public long e { get; set; } // Expiration timestamp
    public string c { get; set; } // Chaos code
}

public static class LicenseValidator
{
    private static readonly string LICENSE_SECRET = Environment.GetEnvironmentVariable("LICENSE_SECRET") ?? "default-secret-please-change";

    public static LicenseValidationResult ValidateOffline(string licenseKey)
    {
        try
        {
            var verification = VerifySignature(licenseKey);
            if (!verification.valid)
            {
                return new LicenseValidationResult { Valid = false, Reason = "Invalid signature" };
            }

            var expiresAt = DateTimeOffset.FromUnixTimeMilliseconds(verification.payload.e).DateTime;
            if (expiresAt < DateTime.UtcNow)
            {
                return new LicenseValidationResult { Valid = false, Reason = "License expired" };
            }

            return new LicenseValidationResult
            {
                Valid = true,
                UserId = verification.payload.u,
                ExpiresAt = expiresAt,
                IsOffline = true
            };
        }
        catch
        {
            return new LicenseValidationResult { Valid = false, Reason = "Validation failed" };
        }
    }

    private static (LicensePayload payload, bool valid) VerifySignature(string licenseKey)
    {
        var parts = licenseKey.Split('.');
        if (parts.Length != 2)
        {
            throw new ArgumentException("Invalid license format");
        }

        var payload = JsonSerializer.Deserialize<LicensePayload>(
            Encoding.UTF8.GetString(Convert.FromBase64String(parts[0])));

        var expectedSignature = GenerateSignature(payload);
        var isValid = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(parts[1]),
            Encoding.UTF8.GetBytes(expectedSignature));

        return (payload, isValid);
    }

    private static string GenerateSignature(LicensePayload payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(LICENSE_SECRET));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload)));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
