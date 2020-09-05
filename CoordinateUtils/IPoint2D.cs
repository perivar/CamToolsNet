
using System;

namespace CoordinateUtils
{
	/// <summary>
	/// Description of IPoint2D.
	/// </summary>
	public interface IPoint2D
	{
		float X { get; }

		float Y { get; }
		
		bool IsEmpty { get; }
	}
}
