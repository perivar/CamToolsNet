using Microsoft.AspNetCore.Http;
using System.Text.Json;

public static class SessionExtensions
{
    public static void SetObjectAsJson(this ISession session, string key, object value)
    {
        var serializerOptions = new JsonSerializerOptions
        {
            Converters = { new CustomJsonDxfConverter() }
        };

        //var stringValue = JsonSerializer.Serialize(value, serializerOptions);
        var stringValue = JsonSerializer.Serialize(value);
        session.SetString(key, stringValue);
    }

    public static T GetObjectFromJson<T>(this ISession session, string key)
    {
        var serializerOptions = new JsonSerializerOptions
        {
            Converters = { new CustomJsonDxfConverter() }
        };

        var stringValue = session.GetString(key);
        //return stringValue == null ? default(T) : JsonSerializer.Deserialize<T>(stringValue, serializerOptions);
        return stringValue == null ? default(T) : JsonSerializer.Deserialize<T>(stringValue);
    }
}