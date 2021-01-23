using System;
using System.Collections.Generic;

namespace Util
{
	/// <summary>
	/// Transformation Utility Methods.
	/// </summary>
	public static class CollectionsUtils
	{
		public static IEnumerable<Tuple<T, T>> ConsecutivePairs<T>(this IEnumerable<T> sequence)
		{
			// Omitted nullity checking; would need an extra method to cope with
			// iterator block deferred execution
			using (IEnumerator<T> iterator = sequence.GetEnumerator())
			{
				if (!iterator.MoveNext())
				{
					yield break;
				}
				T previous = iterator.Current;
				while (iterator.MoveNext())
				{
					yield return Tuple.Create(previous, iterator.Current);
					previous = iterator.Current;
				}
			}
		}

		public static void Swap<T>(ref T lhs, ref T rhs)
		{
			T temp;
			temp = lhs;
			lhs = rhs;
			rhs = temp;
		}
	}
}