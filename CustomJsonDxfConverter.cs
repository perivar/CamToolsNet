using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using netDxf;

// https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-converters-how-to
public class CustomJsonDxfConverter : JsonConverter<DxfDocument>
{
    public override DxfDocument Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var dxf = new DxfDocument();

        if (reader.TokenType != JsonTokenType.StartArray)
        {
            throw new FormatException();
        }

        while (reader.Read())
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.StartObject:
                case JsonTokenType.EndObject:
                    break;
                case JsonTokenType.StartArray:
                case JsonTokenType.EndArray:
                    break;
                case JsonTokenType.PropertyName:
                    string valueName = reader.GetString();
                    break;
                case JsonTokenType.String:
                    string valueString = reader.GetString();
                    break;
                case JsonTokenType.Number:
                    double valueNumber = reader.GetDouble();
                    break;
                case JsonTokenType.True:
                case JsonTokenType.False:
                    bool valueBool = reader.GetBoolean();
                    break;
                case JsonTokenType.Null:
                    break;
                default:
                    throw new ArgumentException();
            }
        }

        // throw new FormatException();
        return dxf;
    }

    public override void Write(Utf8JsonWriter writer, DxfDocument value, JsonSerializerOptions options)
    {
        writer.WriteStartArray();

        foreach (var c in value.Circles)
        {
            writer.WriteStartObject();

            writer.WriteString("Layer", c.Layer.Name);

            writer.WritePropertyName("Center");
            JsonSerializer.Serialize(writer, c.Center, options);

            writer.WriteNumber("Radius", c.Radius);

            writer.WriteEndObject();
        }

        writer.WriteEndArray();
        writer.Flush();
    }
}
