using System.Drawing;

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
			Min = Point3D.Empty;
			Max = Point3D.Empty;
		}

		public Bounds(float minX, float maxX, float minY, float maxY, float minZ, float maxZ)
		{
			Min = new Point3D(minX, minY, minZ);
			Max = new Point3D(maxX, maxY, maxZ);
		}
	}
}