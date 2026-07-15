export async function requestOrientationPermission() {
  const orientationEvent = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
  const motionEvent = window.DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
  if (typeof orientationEvent?.requestPermission === 'function') {
    // Both calls are created while the button tap still counts as a user gesture on iOS.
    const orientation = orientationEvent.requestPermission()
    const motion = typeof motionEvent?.requestPermission === 'function' ? motionEvent.requestPermission() : Promise.resolve('granted' as const)
    const [orientationResult] = await Promise.allSettled([orientation, motion])
    return orientationResult.status === 'fulfilled' && orientationResult.value === 'granted'
  }
  return 'DeviceOrientationEvent' in window
}
