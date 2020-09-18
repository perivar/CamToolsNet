using System;

namespace CoordinateUtils
{
	/// <summary>
	/// Class to hold a bounds object (min and max)
	/// </summary>
	public class Bounds
	{
		public Point3D Min { get; set; }
		public Point3D Max { get; set; }

		public Bounds()
		{
			Min = new Point3D();
			Max = new Point3D();
		}

		public Bounds(float minX, float maxX, float minY, float maxY, float minZ, float maxZ)
		{
			Min = new Point3D(minX, minY, minZ);
			Max = new Point3D(maxX, maxY, maxZ);
		}

		public Bounds(Point3D min, Point3D max)
		{
			Min = min;
			Max = max;
		}


	}
}