import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { getJournalProfile, listJournalProfiles } from "@/features/journal-profiles/api/journal-profiles.api";
import { JournalProfileSectionCard } from "@/features/journal-profiles/components/JournalProfileSectionCard";
import type { JournalProfile, JournalProfileSection } from "@/features/journal-profiles/model/journal-profile.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { GsapListItem, GsapReveal } from "@/shared/ui/gsap-motion";

const IMRAD_SECTION_KEYS = ["introduction", "methods", "results", "discussion"] as const;

export function JournalProfilesPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProfileId = searchParams.get("profileId") ?? "";
  const [profiles, setProfiles] = useState<JournalProfile[]>([]);
  const [profile, setProfile] = useState<JournalProfile | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    setProfilesError(null);

    void listJournalProfiles()
      .then((items) => {
        if (cancelled) return;
        setProfiles(items);
        const nextProfileId = items.some((item) => item.id === selectedProfileId)
          ? selectedProfileId
          : (items[0]?.id ?? "");
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          if (nextProfileId) next.set("profileId", nextProfileId);
          else next.delete("profileId");
          return next;
        }, { replace: true });
      })
      .catch((error: unknown) => {
        if (!cancelled) setProfilesError(error instanceof Error ? error.message : t("journalProfiles.loadError"));
      })
      .finally(() => {
        if (!cancelled) setProfilesLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadKey, t]);

  useEffect(() => {
    if (profilesLoading || profilesError) return;
    const nextProfileId = profiles.some((item) => item.id === selectedProfileId)
      ? selectedProfileId
      : (profiles[0]?.id ?? "");
    if (nextProfileId !== selectedProfileId) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextProfileId) next.set("profileId", nextProfileId);
        else next.delete("profileId");
        return next;
      }, { replace: true });
    }
  }, [profiles, profilesError, profilesLoading, selectedProfileId, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedProfileId) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return () => { cancelled = true; };
    }

    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    void getJournalProfile(selectedProfileId)
      .then((item) => {
        if (!cancelled) setProfile(item);
      })
      .catch((error: unknown) => {
        if (!cancelled) setProfileError(error instanceof Error ? error.message : t("journalProfiles.detailError"));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedProfileId, detailReloadKey, t]);

  function selectProfile(profileId: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (profileId) next.set("profileId", profileId);
      else next.delete("profileId");
      return next;
    }, { replace: true });
  }

  const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.resolvedLanguage ?? "en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const imradSections = profile
    ? IMRAD_SECTION_KEYS
      .map((key) => profile.sections.find((section) => section.key === key))
      .filter((section): section is JournalProfileSection => Boolean(section))
    : [];
  const structureSections = imradSections.length > 0 ? imradSections : (profile?.sections ?? []);

  return (
    <div className="space-y-5">
      <GsapReveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("journalProfiles.step")}</p>
            <h2 className="slrw-page-title mt-1">{t("journalProfiles.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{t("journalProfiles.description")}</p>
          </div>
          <div className="w-full sm:w-72 sm:shrink-0">
            <label htmlFor="journal-profile" className="mb-1.5 block text-sm font-medium text-foreground">
              {t("journalProfiles.profileLabel")}
            </label>
            <select
              id="journal-profile"
              value={selectedProfileId}
              onChange={(event) => selectProfile(event.target.value)}
              disabled={profilesLoading || profiles.length === 0}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:h-10 sm:text-sm"
            >
              <option value="">{t("journalProfiles.chooseProfile")}</option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · v{item.version}</option>
              ))}
            </select>
          </div>
        </div>
      </GsapReveal>

      {profilesLoading || profileLoading ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("journalProfiles.loading")}</CardContent></Card>
      ) : profilesError ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p role="alert" className="text-sm text-destructive">{profilesError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((current) => current + 1)}>{t("common.retry")}</Button>
          </CardContent>
        </Card>
      ) : profileError ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p role="alert" className="text-sm text-destructive">{profileError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setDetailReloadKey((current) => current + 1)}>{t("common.retry")}</Button>
          </CardContent>
        </Card>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("journalProfiles.noProfiles")}</CardContent></Card>
      ) : profile ? (
        <GsapReveal key={profile.id} delay={0.04} className="space-y-4" effect="fade">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{profile.name}</h3>
              <Badge variant={profile.verification.status === "verified" ? "success" : "warning"}>
                {t(`journalProfiles.status.${profile.verification.status}`)}
              </Badge>
            </div>
            {profile.verification.status === "verified" && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                  {t("journalProfiles.verificationDetails")}
                </summary>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  {profile.verification.verifiedBy && (
                    <p>{t("journalProfiles.verifiedBy", { name: profile.verification.verifiedBy })}</p>
                  )}
                  {profile.verification.verifiedAt && (
                    <p>{t("journalProfiles.verifiedAt", { date: formatDate(profile.verification.verifiedAt) })}</p>
                  )}
                  {profile.verification.policySourceUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block break-all text-primary underline-offset-4 hover:underline">
                      {url}
                    </a>
                  ))}
                </div>
              </details>
            )}
          </div>

          {profile.verification.status === "unverified" && (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-warning-soft p-3 text-warning sm:items-center">
              <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 sm:mt-0" aria-hidden="true" />
              <p className="text-sm leading-5 text-pretty">{t("journalProfiles.unverifiedNotice")}</p>
            </div>
          )}

          <section aria-labelledby="journal-profiles-imrad-title">
            <div className="mb-3">
              <h3 id="journal-profiles-imrad-title" className="text-base font-semibold text-foreground">
                {t("journalProfiles.sectionsTitle")}
              </h3>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {structureSections.map((section, index) => (
                <GsapListItem key={section.key} delay={index * 0.04}>
                  <JournalProfileSectionCard section={section} position={index + 1} />
                </GsapListItem>
              ))}
            </ul>
          </section>
        </GsapReveal>
      ) : null}
    </div>
  );
}
