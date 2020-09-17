using System.Drawing;
using System.Globalization;
using System.Text.Json.Serialization;

namespace CoordinateUtils
{
	/// <summary>
	/// Class to hold a 3D point (i.e. x, y and z coordinates)
	/// </summary>
	public class Point3D : IPoint2D
	{
		public float X { get; set; }
		public float Y { get; set; }
		public float Z { get; set; }

		public static readonly Point3D Empty = new Point3D(0, 0, 0);

		// parameter-less constructor needed for de-serialization
		public Point3D()
		{

		}

		public Point3D(float x, float y, float z)
		{
			X = x;
			Y = y;
			Z = z;
		}

		public Point3D(float x, float y)
		{
			X = x;
			Y = y;
			Z = 0;
		}

		public Point3D(PointF point)
		{
			X = point.X;
			Y = point.Y;
			Z = 0;
		}

		[JsonIgnore]
		public PointF PointF
		{
			get
			{
				return new PointF(this.X, this.Y);
			}
		}

		[JsonIgnore]
		public bool IsEmpty
		{
			get
			{
				return this.X == 0f && this.Y == 0f && this.Z == 0f;
			}
		}

		public static bool operator ==(Point3D left, Point3D right)
		{
			return left.X == right.X && left.Y == right.Y && left.Z == right.Z;
		}

		public static bool operator !=(Point3D left, Point3D right)
		{
			return !(left == right);
		}

		public override bool Equals(object obj)
		{
			if (!(obj is Point3D))
			{
				return false;
			}
			var point3D = (Point3D)obj;
			return point3D.X == this.X && point3D.Y == this.Y && point3D.Z == this.Z
				&& point3D.GetType().Equals(base.GetType());
		}

		public override int GetHashCode()
		{
			return base.GetHashCode();
		}

		public override string ToString()
		{
			return string.Format(CultureInfo.CurrentCulture,
								 "{{X={0}, Y={1}, Z={2}}}", new object[] {
									 this.X,
									 this.Y,
									 this.Z
								 });
		}
	}
}
