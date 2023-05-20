export function calculateMovingAverage(window) {
  const sum = window.reduce((acc, val) => acc + val, 0);
  return sum / window.length;
}