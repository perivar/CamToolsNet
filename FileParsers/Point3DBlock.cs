using System.Drawing;
using System.Collections.Generic;
using System.Globalization;
using CoordinateUtils;

namespace GCode
{
    /// <summary>
    /// Class to hold gcode-instructions connected to a 3D point (i.e. x, y and z coordinates)
    /// </summary>
    public class Point3DBlock : IPoint2D
    {
        private Point3D point;

        private List<GCodeInstruction> gcodeInstructions = new List<GCodeInstruction>();
        public List<GCodeInstruction> GCodeInstructions { get { return gcodeInstructions; } }

        public PointF PointF
        {
            get
            {
                return new PointF(point.X, point.Y);
            }
        }

        #region IPoint2D implementation
        public float X
        {
            get
            {
                return point.X;
            }
        }

        public float Y
        {
            get
            {
                return point.Y;
            }
        }

        public float Z
        {
            set
            {
                point.Z = value;
            }
            get
            {
                return point.Z;
            }
        }

        public int BestPathIndex { set; get; }

        public bool IsEmpty
        {
            get
            {
                return this.X == 0f && this.Y == 0f && this.Z == 0f;
            }
        }

        public bool EqualXYCoordinates(Point3DBlock other)
        {
            if (other != null && this.X == other.X && this.Y == other.Y) return true;
            return false;
        }

        public bool EqualCoordinates(Point3DBlock other)
        {
            if (other != null && this.X == other.X && this.Y == other.Y && this.Z == other.Z) return true;
            return false;
        }

        #endregion

        public Point3DBlock(float x, float y)
        {
            point.X = x;
            point.Y = y;
            point.Z = 0;
        }

        public override string ToString()
        {
            return string.Format(CultureInfo.CurrentCulture,
                                 "X={0}, Y={1}, Z={2}, Index: {3} - Count: {4}",
                                 this.X,
                                 this.Y,
                                 this.Z,
                                 this.BestPathIndex,
                                 this.gcodeInstructions.Count
                                );
        }
    }
}