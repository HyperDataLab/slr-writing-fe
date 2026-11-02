import { apiRequest } from "@/shared/lib/api-client";
import type { JournalProfile } from "@/features/journal-profiles/model/journal-profile.types";

export function listJournalProfiles(): Promise<JournalProfile[]> {
  return apiRequest<JournalProfile[]>("/journal-profiles");
}

export function getJournalProfile(profileId: string): Promise<JournalProfile> {
  return apiRequest<JournalProfile>(`/journal-profiles/${encodeURIComponent(profileId)}`);
}
