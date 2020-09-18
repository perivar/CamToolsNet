using System;

namespace CoordinateUtils
{
	/// <summary>
	/// Class to hold a rect object (x, y, width, height)
	/// </summary>
	public class Rect
	{
		public float X { get; set; }
		public float Y { get; set; }
		public float Width { get; set; }
		public float Height { get; set; }

		public Rect()
		{
			X = 0;
			Y = 0;
			Width = 0;
			Height = 0;
		}

		public Rect(float x, float y, float width, float height)
		{
			X = x;
			Y = y;
			Width = width;
			Height = height;
		}
	}
}