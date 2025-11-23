"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserProfile,
  UserCategory,
} from "@/types/recommendations";

const STORAGE_KEY = "repohub_user_profile";

/**
 * Detect user's operating system from browser
 */
function detectOS(): string {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  // Windows
  if (userAgent.indexOf("win") !== -1 || platform.indexOf("win") !== -1) {
    return "windows";
  }

  // macOS
  if (
    userAgent.indexOf("mac") !== -1 ||
    platform.indexOf("mac") !== -1 ||
    userAgent.indexOf("darwin") !== -1
  ) {
    return "macos";
  }

  // Linux distros
  if (userAgent.indexOf("linux") !== -1 || platform.indexOf("linux") !== -1) {
    // Try to detect specific distro from user agent (rare but possible)
    if (userAgent.indexOf("ubuntu") !== -1) {
      return "ubuntu";
    }
    if (userAgent.indexOf("fedora") !== -1) {
      return "fedora";
    }
    if (userAgent.indexOf("arch") !== -1) {
      return "arch";
    }
    if (userAgent.indexOf("debian") !== -1) {
      return "debian";
    }

    // Default to Ubuntu for generic Linux
    return "ubuntu";
  }

  return "unknown";
}

const CURRENT_PROFILE_VERSION = 1;

/**
 * Get default user profile
 */
function getDefaultProfile(): UserProfile {
  return {
    version: CURRENT_PROFILE_VERSION,
    categories: [],
    detectedOS: detectOS(),
    selectedOS: undefined,
    hasCompletedOnboarding: false,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Hook for managing user recommendation profile in localStorage
 */
export function useRecommendationProfile() {
  const [profile, setProfile] = useState<UserProfile>(getDefaultProfile());
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from localStorage on mount
  useEffect(() => {
    // We intentionally do NOT load from localStorage anymore to reset on refresh
    // as requested by user preference change.
    
    // Initialize with default profile (detects OS)
    const defaultProfile = getDefaultProfile();
    setProfile(defaultProfile);
    setIsLoading(false);
  }, []);

  // Save profile to state only (session persistence)
  const saveProfile = useCallback(
    (newProfile: Partial<UserProfile>) => {
      try {
        const updated: UserProfile = {
          ...profile,
          ...newProfile,
          version: CURRENT_PROFILE_VERSION,
          lastUpdated: new Date().toISOString(),
        };

        console.log("💾 Saving profile (Session only):", updated);

        setProfile(updated);
        // localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); // Disabled persistence

        return true;
      } catch (error) {
        console.error("❌ Error saving user profile:", error);
        return false;
      }
    },
    [profile]
  );

  // Update categories
  const updateCategories = useCallback(
    (categories: UserCategory[]) => {
      return saveProfile({ categories });
    },
    [saveProfile]
  );

  // Update selected OS (manual override)
  const updateSelectedOS = useCallback(
    (os: string) => {
      return saveProfile({ selectedOS: os });
    },
    [saveProfile]
  );



  // Mark onboarding as completed
  const completeOnboarding = useCallback(() => {
    return saveProfile({ hasCompletedOnboarding: true });
  }, [saveProfile]);

  // Reset profile
  const resetProfile = useCallback(() => {
    try {
      const defaultProfile = getDefaultProfile();
      setProfile(defaultProfile);
      // localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProfile)); // Disabled persistence
      return true;
    } catch (error) {
      console.error("Error resetting user profile:", error);
      return false;
    }
  }, []);

  // Get effective OS (selectedOS or detectedOS)
  const getEffectiveOS = useCallback((): string => {
    return profile.selectedOS || profile.detectedOS || "ubuntu";
  }, [profile]);

  // Check if profile is complete enough for recommendations
  const isProfileComplete = useCallback((): boolean => {
    return profile.categories.length > 0 && getEffectiveOS() !== "unknown";
  }, [profile, getEffectiveOS]);

  return {
    profile,
    isLoading,
    saveProfile,
    updateCategories,
    updateSelectedOS,
    completeOnboarding,
    resetProfile,
    getEffectiveOS,
    isProfileComplete,
    detectedOS: profile.detectedOS,
    hasCompletedOnboarding: profile.hasCompletedOnboarding,
  };
}
