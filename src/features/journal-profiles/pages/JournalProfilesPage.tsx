import { useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { getJournalProfile, listJournalProfiles } from "@/features/journal-profiles/api/journal-profiles.api";
import { JournalProfileSectionCard } from "@/features/journal-profiles/components/JournalProfileSectionCard";
import type { JournalProfile } from "@/features/journal-profiles/model/journal-profile.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapListItem, GsapReveal } from "@/shared/ui/gsap-motion";

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

  return (
    <div className="space-y-7">
      <GsapReveal>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("journalProfiles.step")}</p>
          <h2 className="slrw-page-title mt-1">{t("journalProfiles.title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t("journalProfiles.description")}</p>
        </div>
      </GsapReveal>

      <GsapReveal>
        <Card>
          <CardHeader>
            <CardTitle>{t("journalProfiles.selectTitle")}</CardTitle>
            <CardDescription>{t("journalProfiles.selectDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label htmlFor="journal-profile" className="text-sm font-medium text-foreground">
                {t("journalProfiles.profileLabel")}
              </label>
              <select
                id="journal-profile"
                value={selectedProfileId}
                onChange={(event) => selectProfile(event.target.value)}
                disabled={profilesLoading || profiles.length === 0}
                className="h-10 w-full max-w-xl rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground/40 disabled:opacity-60"
              >
                <option value="">{t("journalProfiles.chooseProfile")}</option>
                {profiles.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · v{item.version}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
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
        <GsapReveal key={profile.id} delay={0.04} className="space-y-5" effect="fade">
          <GsapReveal>
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                  <Badge variant="secondary">v{profile.version}</Badge>
                  <Badge
                    variant={profile.verification.status === "verified" ? "default" : "outline"}
                    className={profile.verification.status === "unverified" ? "border-warning-border bg-warning-soft text-warning" : undefined}
                  >
                    {t(`journalProfiles.status.${profile.verification.status}`)}
                  </Badge>
                </div>
                <CardDescription>{t("journalProfiles.profileId", { id: profile.id })}</CardDescription>
              </div>
              <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                {t(`journalProfiles.wordBudgetSource.${profile.wordBudgetSource}`)}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {profile.notice && (
                <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-soft p-4 text-warning">
                  <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">{t("journalProfiles.noticeTitle")}</p>
                    <p className="mt-1 text-sm leading-6">{profile.notice}</p>
                  </div>
                </div>
              )}

              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{t("journalProfiles.journal")}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {profile.journal.name ? (
                      profile.journal.url ? (
                        <a href={profile.journal.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                          {profile.journal.name}
                        </a>
                      ) : profile.journal.name
                    ) : t("journalProfiles.noTargetJournal")}
                  </dd>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{t("journalProfiles.articleType")}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{t(`journalProfiles.articleTypes.${profile.articleType}`)}</dd>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{t("journalProfiles.manuscriptLanguage")}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{t(`journalProfiles.languages.${profile.language}`)}</dd>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <dt className="text-xs text-muted-foreground">{t("journalProfiles.citationStyle")}</dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{profile.citationStyle ?? t("journalProfiles.notSpecified")}</dd>
                </div>
              </dl>

              {profile.verification.status === "verified" && (
                <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
                  <p className="text-sm text-muted-foreground">
                    {t("journalProfiles.verifiedBy", { name: profile.verification.verifiedBy ?? "" })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.verification.verifiedAt ? t("journalProfiles.verifiedAt", { date: formatDate(profile.verification.verifiedAt) }) : ""}
                  </p>
                  {profile.verification.policySourceUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline">
                      {url}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </GsapReveal>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{t("journalProfiles.sectionsTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("journalProfiles.sectionsDescription", { count: profile.sections.length })}
              </p>
            </div>
            <Badge variant="secondary">{t("journalProfiles.sectionOrder")}</Badge>
          </div>

          <ul className="grid gap-4 lg:grid-cols-2">
            {profile.sections.map((section, index) => (
              <GsapListItem key={section.key} delay={index * 0.04}>
                <JournalProfileSectionCard section={section} />
              </GsapListItem>
            ))}
          </ul>
        </GsapReveal>
      ) : null}
    </div>
  );
}
