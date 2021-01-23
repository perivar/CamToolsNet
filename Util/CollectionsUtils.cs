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

		/// <summary>
		/// Swap two reference objects
		/// @see https://rosettacode.org/wiki/Generic_swap#C.23:_Using_a_generic_method
		/// </summary>
		/// <param name="a">object 1</param>
		/// <param name="b">object 2</param>
		/// <typeparam name="T">type</typeparam>
		public static void Swap<T>(ref T a, ref T b)
		{
			T temp;
			temp = a;
			a = b;
			b = temp;
		}
	}
}