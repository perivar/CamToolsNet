using System;
using System.Diagnostics.CodeAnalysis;
using System.Drawing;
using System.Globalization;
using System.Text.Json.Serialization;

namespace CoordinateUtils
{
	/// <summary>
	/// Class to hold a 3D point (i.e. x, y and z coordinates)
	/// </summary>
	public class Point3D : IPoint2D, IComparable<Point3D>
	{
		public float X { get; set; }
		public float Y { get; set; }
		public float Z { get; set; }

		// parameter-less constructor needed for de-serialization
		public Point3D()
		{
			X = 0;
			Y = 0;
			Z = 0;
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
		public Point3D(Point3D oldPoint)
		{
			X = oldPoint.X;
			Y = oldPoint.Y;
			Z = oldPoint.Z;
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

		public bool NearlyEquals(object o)
		{
			if (o is Point3D)
			{
				var other = o as Point3D;
				if (this.X.AlmostEquals(other.X)
				&& this.Y.AlmostEquals(other.Y)
				&& this.Z.AlmostEquals(other.Z))
				{
					return true;
				}
			}
			return false;
		}

		#region Object overrides
		public override string ToString()
		{
			return string.Format(CultureInfo.CurrentCulture,
								 "{{X={0:0.##}, Y={1:0.##}, Z={2:0.##}}}", new object[] {
									 this.X,
									 this.Y,
									 this.Z
								 });
		}

		public override bool Equals(object o)
		{
			// Using ToString with only two decimals might work:
			// return o.ToString() == this.ToString();
			// but -0 and 0 will not be equal!
			// Therefore NearlyEquals is better
			return NearlyEquals(o);
		}

		public override int GetHashCode()
		{
			return this.ToString().GetHashCode();
		}
		#endregion

		#region Overloaded ops
		// overloaded operator +
		public static Point3D operator +(Point3D p1, Point3D p2)
		{
			return new Point3D(p1.X + p2.X, p1.Y + p2.Y, p1.Z + p2.Z);
		}

		// overloaded operator -
		public static Point3D operator -(Point3D p1, Point3D p2)
		{
			return new Point3D(p1.X - p2.X, p1.Y - p2.Y, p1.Z - p2.Z);
		}

		public static Point3D operator +(Point3D p1, int change)
		{
			return new Point3D(p1.X + change, p1.Y + change);
		}

		public static Point3D operator +(int change, Point3D p1)
		{
			return new Point3D(p1.X + change, p1.Y + change);
		}

		// Add 1 to the X/Y values incoming Point.
		public static Point3D operator ++(Point3D p1)
		{
			return new Point3D(p1.X + 1, p1.Y + 1);
		}

		// Subtract 1 from the X/Y values incoming Point.
		public static Point3D operator --(Point3D p1)
		{
			return new Point3D(p1.X - 1, p1.Y - 1);
		}

		// Now let's overload the == and != operators.
		public static bool operator ==(Point3D p1, Point3D p2)
		{
			return p1.Equals(p2);
		}

		public static bool operator !=(Point3D p1, Point3D p2)
		{
			return !p1.Equals(p2);
		}

		public static bool operator <(Point3D p1, Point3D p2)
		{
			return (p1.CompareTo(p2) < 0);
		}

		public static bool operator >(Point3D p1, Point3D p2)
		{
			return (p1.CompareTo(p2) > 0);
		}

		public static bool operator <=(Point3D p1, Point3D p2)
		{
			return (p1.CompareTo(p2) <= 0);
		}

		public static bool operator >=(Point3D p1, Point3D p2)
		{
			return (p1.CompareTo(p2) >= 0);
		}
		#endregion

		public int CompareTo([AllowNull] Point3D other)
		{
			if (this.X > other.X && this.Y > other.Y)
				return 1;
			if (this.X < other.X && this.Y < other.Y)
				return -1;
			else
				return 0;
		}
	}
}
