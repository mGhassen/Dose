import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function binarySearchInsert<T>(
  array: T[],
  element: T,
  compareFn: (a: T, b: T) => number
): void {
  let left = 0;
  let right = array.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (compareFn(array[mid], element) <= 0) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  array.splice(left, 0, element);
}
