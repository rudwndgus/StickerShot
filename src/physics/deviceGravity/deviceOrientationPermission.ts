export async function requestOrientationPermission() {
  const event = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
  if (typeof event.requestPermission === 'function') return (await event.requestPermission()) === 'granted'
  return 'DeviceOrientationEvent' in window
}
