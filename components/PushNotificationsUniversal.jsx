"use client"
import { useState, useEffect } from 'react'
import PushNotifications from './PushNotifications'
import PushNotificationsIOS from './PushNotificationsIOS'

export default function PushNotificationsUniversal({ notificationTime, setNotificationTime, notificationEnabled, setNotificationEnabled, savedNotificationConfirm, setSavedNotificationConfirm, onSaveNotification }) {
  const [isIOS, setIsIOS] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Detect iOS more reliably
    const detectIOS = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const platform = navigator.platform?.toLowerCase() || ''
      
      // Check for iPhone, iPad, iPod
      const iosDevicePattern = /iphone|ipad|ipod/
      const isIOSDevice = iosDevicePattern.test(userAgent)
      
      // Check for iPad on iOS 13+ (reports as Mac)
      const isMacWithTouch = platform === 'macintel' && navigator.maxTouchPoints > 1
      
      return isIOSDevice || isMacWithTouch
    }

    setIsIOS(detectIOS())
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">🔔 Push Notifications</h5>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span>Detecting device...</span>
          </div>
        </div>
      </div>
    )
  }

  // Use iOS-specific component for iOS devices
  if (isIOS) {
    return <PushNotificationsIOS
      notificationTime={notificationTime}
      setNotificationTime={setNotificationTime}
      notificationEnabled={notificationEnabled}
      setNotificationEnabled={setNotificationEnabled}
      savedNotificationConfirm={savedNotificationConfirm}
      setSavedNotificationConfirm={setSavedNotificationConfirm}
      onSaveNotification={onSaveNotification}
    />
  }

  // Use standard component for other devices
  return <PushNotifications
    notificationTime={notificationTime}
    setNotificationTime={setNotificationTime}
    notificationEnabled={notificationEnabled}
    setNotificationEnabled={setNotificationEnabled}
    savedNotificationConfirm={savedNotificationConfirm}
    setSavedNotificationConfirm={setSavedNotificationConfirm}
    onSaveNotification={onSaveNotification}
  />
}