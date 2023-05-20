import { calculateMovingAverage } from "./calculate-moving-average.mjs";

export function predictNextWindow(timestamps, packetSizes) {
  const windows = [];
  const predictions = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (i >= 10) {
      const window = packetSizes.slice(i - 10, i);
      windows.push(window);
      const average = calculateMovingAverage(window);
      predictions.push(average);
    }
  }

  return { windows, predictions };
}