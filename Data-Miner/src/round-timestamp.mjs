export function roundTimestamp(timestamp) {
  const ONE_MINUTE_IN_SECONDS = 60;
  const value = Number.parseInt(String(Math.floor(timestamp / ONE_MINUTE_IN_SECONDS) * ONE_MINUTE_IN_SECONDS));

  return value;
}