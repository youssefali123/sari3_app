import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { ProfileErrorView } from '@/features/auth/presentation/components/ProfileErrorView';
import { ONBOARDING_COMPLETED_KEY } from './onboarding';

/**
 * App entry point — role-based redirect and onboarding gatekeeper.
 * 1. Checks if onboarding has been completed on this device.
 * 2. Unauthenticated first-time users see onboarding.
 * 3. Logged-in drivers go to driver queue.
 * 4. Customers / guests go to customer home.
 */
export default function Index() {
  const { user, profile, isLoading, isProfileLoading, authError } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)
      .then((val) => {
        setHasSeenOnboarding(val === 'true');
        setOnboardingChecked(true);
      })
      .catch(() => {
        setHasSeenOnboarding(false);
        setOnboardingChecked(true);
      });
  }, []);

  if (isLoading || (user && isProfileLoading) || !onboardingChecked) {
    // Splash is still showing; render nothing beneath it.
    return null;
  }

  if (authError === 'profile_not_found') {
    return <ProfileErrorView />;
  }

  if (!hasSeenOnboarding && !user) {
    return <Redirect href="/onboarding" />;
  }

  if (user && profile?.role === 'driver') {
    return <Redirect href="/(driver)/available-orders" />;
  }

  return <Redirect href="/(customer)/(home)" />;
}

