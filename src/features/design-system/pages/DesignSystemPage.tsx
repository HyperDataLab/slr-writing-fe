import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { ListRow } from "@/shared/ui/list-row";

const colorTokens = [
  { key: "canvas", token: "--slr-canvas" },
  { key: "surface", token: "--slr-surface" },
  { key: "ink", token: "--slr-ink" },
  { key: "muted", token: "--slr-muted-ink" },
  { key: "primary", token: "--slr-primary" },
  { key: "primaryText", token: "--primary-foreground" },
  { key: "border", token: "--slr-border" },
  { key: "borderStrong", token: "--slr-border-strong" },
  { key: "success", token: "--slr-success" },
  { key: "warning", token: "--slr-warning" },
  { key: "danger", token: "--slr-danger" },
] as const;

const contrastPairs = [
  { key: "ink", foreground: "--slr-ink", background: "--slr-canvas" },
  { key: "muted", foreground: "--slr-muted-ink", background: "--slr-canvas" },
  { key: "primary", foreground: "--primary-foreground", background: "--slr-primary" },
  { key: "success", foreground: "--slr-success", background: "--slr-success-soft" },
  { key: "warning", foreground: "--slr-warning", background: "--slr-warning-soft" },
  { key: "danger", foreground: "--slr-danger", background: "--slr-danger-soft" },
  { key: "focus", foreground: "--slr-border-focus", background: "--slr-surface" },
] as const;

const typeScale = [
  { key: "xs", className: "text-xs", size: "12px", weight: 500 },
  { key: "sm", className: "text-sm", size: "14px", weight: 400 },
  { key: "base", className: "text-base", size: "16px", weight: 600 },
  { key: "lg", className: "text-lg", size: "18px", weight: 600 },
  { key: "xl", className: "text-xl", size: "20px", weight: 600 },
  { key: "2xl", className: "text-2xl", size: "24px", weight: 600 },
  { key: "3xl", className: "text-3xl", size: "30px", weight: 700 },
] as const;

const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40] as const;
const radiusScale = [
  { value: "8px", className: "rounded-lg" },
  { value: "12px", className: "rounded-xl" },
  { value: "16px", className: "rounded-2xl" },
  { value: "Full", className: "rounded-full" },
] as const;

function resolveColor(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function colorToHex(value: string) {
  const values = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!values || values.length < 3) return value;
  return `#${values.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(color: string) {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map((channel) => Number(channel) / 255);
  if (!channels || channels.length < 3) return 0;
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function StateLabel({ children }: { children: ReactNode }) {
  return <p className="ds-state-label text-xs text-muted-foreground">{children}</p>;
}

function SpecimenCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="ds-component-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function DialogSpecimen() {
  const { t } = useTranslation();
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const fieldId = useId();

  return (
    <div
      ref={setPortalContainer}
      className="ds-dialog-preview"
      inert
      data-demo-state="open"
    >
      {portalContainer ? (
        <Dialog open modal={false}>
          <DialogContent
            portalContainer={portalContainer}
            className="ds-dialog-preview__content"
            overlayClassName="ds-dialog-preview__overlay"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{t("designSystem.dialogTitle")}</DialogTitle>
              <DialogDescription>{t("designSystem.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor={fieldId} className="w-fit cursor-pointer text-sm font-medium">
                {t("designSystem.dialogField")}
              </label>
              <Input id={fieldId} value={t("designSystem.fieldValue")} readOnly />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline">
                {t("designSystem.dialogCancel")}
              </Button>
              <Button type="button" variant="default">
                {t("designSystem.dialogConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function DesignSystemPage() {
  const { t } = useTranslation();
  const [colors, setColors] = useState<Record<string, string>>({});
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const fieldId = useId();

  useEffect(() => {
    const nextColors = Object.fromEntries(
      colorTokens.map(({ token }) => [token, colorToHex(resolveColor(token))]),
    );
    const nextRatios = Object.fromEntries(
      contrastPairs.map(({ key, foreground, background }) => [
        key,
        contrastRatio(resolveColor(foreground), resolveColor(background)),
      ]),
    );
    setColors(nextColors);
    setRatios(nextRatios);
  }, []);

  const navItems = ["colors", "typography", "spacing", "components", "accessibility"] as const;
  const statusItems = [
    { key: "draft", variant: "secondary" },
    { key: "processing", variant: "default" },
    { key: "complete", variant: "success" },
    { key: "attention", variant: "warning" },
    { key: "failed", variant: "destructive" },
  ] as const;

  return (
    <div className="ds-page min-h-screen bg-background text-foreground">
      <a className="ds-skip-link" href="#design-system-content">
        {t("designSystem.skipToContent")}
      </a>

      <div className="mx-auto grid w-full max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <aside className="ds-sidebar lg:sticky lg:top-6 lg:self-start" aria-label={t("designSystem.navigation")}>
          <div className="mb-4 flex items-center justify-between gap-3 lg:block">
            <p className="text-sm font-semibold">SLR AI Writing</p>
          </div>
          <nav aria-label={t("designSystem.navigation")}>
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              {navItems.map((item) => (
                <li key={item}>
                  <a className="ds-section-link" href={`#ds-${item}`}>
                    {t(`designSystem.sections.${item}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main id="design-system-content" tabIndex={-1} className="ds-main min-w-0 space-y-6" aria-labelledby="ds-page-title">
          <header className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SLR · UI foundations</p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 max-w-3xl space-y-2">
                <h1 id="ds-page-title" className="text-xl font-semibold leading-tight">
                  {t("designSystem.pageTitle")}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {t("designSystem.pageDescription")}
                </p>
              </div>
              <span className="ds-mode-chip" aria-label={t("designSystem.lightMode")}>
                {t("designSystem.lightMode")}
              </span>
            </div>
          </header>

          <section id="ds-colors" className="ds-section space-y-4" aria-labelledby="ds-colors-title">
            <div className="space-y-1">
              <h2 id="ds-colors-title" className="text-lg font-semibold">{t("designSystem.colorsTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("designSystem.colorsDescription")}</p>
            </div>
            <Card>
              <CardContent className="pt-4 sm:pt-5">
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {colorTokens.map(({ key, token }) => (
                    <li className="ds-color-token" key={token}>
                      <span className="ds-color-swatch" style={{ backgroundColor: `var(${token})` }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{t(`designSystem.colorNames.${key}`)}</span>
                        <code className="block truncate text-xs text-muted-foreground" title={token}>{token} · {colors[token] ?? "…"}</code>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-3">
                  <h3 className="text-base font-semibold">{t("designSystem.contrastTitle")}</h3>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="ds-contrast-table w-full text-sm">
                      <thead>
                        <tr>
                          <th scope="col">{t("designSystem.contrastTitle")}</th>
                          <th scope="col">{t("designSystem.ratioHeader")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contrastPairs.map(({ key, foreground, background }) => {
                          const ratio = ratios[key];
                          return (
                            <tr key={key}>
                              <th scope="row">
                                <span
                                  className="ds-contrast-sample"
                                  style={{ color: `var(${foreground})`, backgroundColor: `var(${background})` }}
                                >
                                  Aa
                                </span>
                                {t(`designSystem.contrastLabels.${key}`)}
                              </th>
                              <td>
                                <span>{ratio ? `${ratio.toFixed(2)}:1` : "…"}</span>
                                {ratio && ratio < 4.5 ? <span className="ds-contrast-warning">{t("designSystem.belowAa")}</span> : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="ds-typography" className="ds-section space-y-4" aria-labelledby="ds-typography-title">
            <div className="space-y-1">
              <h2 id="ds-typography-title" className="text-lg font-semibold">{t("designSystem.typographyTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("designSystem.typographyDescription")}</p>
            </div>
            <Card>
              <CardContent className="divide-y divide-border pt-1 sm:pt-1">
                {typeScale.map((type) => (
                  <div className="ds-type-row" key={type.key}>
                    <div className="min-w-0 flex-1">
                      <p className={`${type.className} leading-snug font-medium`}>
                        {t("designSystem.typeSample")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(`designSystem.typeNames.${type.key}`)} · {type.size} · {type.weight}
                      </p>
                    </div>
                    <code className="shrink-0 text-xs text-muted-foreground">text-{type.key}</code>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section id="ds-spacing" className="ds-section space-y-4" aria-labelledby="ds-spacing-title">
            <div className="space-y-1">
              <h2 id="ds-spacing-title" className="text-lg font-semibold">{t("designSystem.spacingTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("designSystem.spacingDescription")}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("designSystem.spacingLabel")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                    {spacingScale.map((value) => (
                      <li className="ds-spacing-item" key={value}>
                        <span className="ds-spacing-bar" style={{ width: `${value}px` }} aria-hidden="true" />
                        <code className="text-xs text-muted-foreground">{value}px</code>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("designSystem.radiusLabel")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {radiusScale.map((radius) => (
                      <li className="ds-radius-item" key={radius.value}>
                        <span className={`ds-radius-sample ${radius.className}`} aria-hidden="true" />
                        <code className="text-xs text-muted-foreground">{radius.value}</code>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t("designSystem.borderRolesTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="ds-border-sample">
                  <span className="ds-border-line ds-border-line--decorative" aria-hidden="true" />
                  <span className="text-sm">{t("designSystem.decorativeBorder")}</span>
                  <code>--border</code>
                </div>
                <div className="ds-border-sample">
                  <span className="ds-border-line ds-border-line--control" aria-hidden="true" />
                  <span className="text-sm">{t("designSystem.controlBorder")}</span>
                  <code>--border-strong</code>
                </div>
                <div className="ds-border-sample">
                  <span className="ds-border-line ds-border-line--focus" aria-hidden="true" />
                  <span className="text-sm">{t("designSystem.focusBorder")}</span>
                  <code>--border-focus</code>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("designSystem.elevationTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="ds-elevation-sample">
                  <span>{t("designSystem.noElevation")}</span>
                  <span className="ds-elevation-card" />
                  <code>shadow-none</code>
                </div>
                <div className="ds-elevation-sample">
                  <span>{t("designSystem.popoverElevation")}</span>
                  <span className="ds-elevation-card ds-elevation-card--popover" />
                  <code>--slr-shadow-popover</code>
                </div>
                <div className="ds-elevation-sample">
                  <span>{t("designSystem.modalElevation")}</span>
                  <span className="ds-elevation-card ds-elevation-card--modal" />
                  <code>--slr-shadow-modal</code>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="ds-components" className="ds-section space-y-4" aria-labelledby="ds-components-title">
            <div className="space-y-1">
              <h2 id="ds-components-title" className="text-lg font-semibold">{t("designSystem.componentsTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("designSystem.componentsDescription")}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <SpecimenCard title={t("designSystem.buttonTitle")} description={t("designSystem.buttonDescription")}>
                <div>
                  <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="outline">{t("designSystem.buttonLabel")}</Button>
                    <Button type="button" variant="default">{t("designSystem.buttonPrimary")}</Button>
                    <Button type="button" variant="secondary">{t("designSystem.buttonLabel")}</Button>
                    <Button type="button" variant="ghost">{t("designSystem.buttonLabel")}</Button>
                  </div>
                </div>
                <div className="ds-button-state-grid">
                  <div>
                    <StateLabel>{t("designSystem.stateLabels.hover")}</StateLabel>
                    <div className="ds-state-frame mt-2" data-demo-state="hover" inert>
                      <Button type="button" variant="outline">{t("designSystem.buttonLabel")}</Button>
                    </div>
                  </div>
                  <div>
                    <StateLabel>{t("designSystem.stateLabels.focus")}</StateLabel>
                    <div className="ds-state-frame mt-2" data-demo-state="focus" inert>
                      <Button type="button" variant="outline" className="ds-force-focus">{t("designSystem.buttonLabel")}</Button>
                    </div>
                  </div>
                  <div>
                    <StateLabel>{t("designSystem.stateLabels.disabled")}</StateLabel>
                    <div className="ds-state-frame mt-2" data-demo-state="disabled" inert>
                      <Button type="button" variant="outline" disabled>{t("designSystem.buttonDisabled")}</Button>
                    </div>
                  </div>
                  <div>
                    <StateLabel>{t("designSystem.stateLabels.loading")}</StateLabel>
                    <div className="ds-state-frame mt-2" data-demo-state="loading" inert>
                      <Button type="button" variant="default" isLoading>{t("designSystem.buttonPrimary")}</Button>
                    </div>
                  </div>
                </div>
              </SpecimenCard>

              <SpecimenCard title={t("designSystem.inputTitle")} description={t("designSystem.inputDescription")}>
                <div className="ds-input-state-grid">
                  <div className="space-y-1.5">
                    <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                    <label htmlFor={`${fieldId}-normal`} className="w-fit cursor-pointer text-sm font-medium">{t("designSystem.fieldLabel")}</label>
                    <Input id={`${fieldId}-normal`} value={t("designSystem.fieldValue")} readOnly aria-describedby={`${fieldId}-helper`} />
                    <p id={`${fieldId}-helper`} className="min-h-4 text-xs text-muted-foreground">{t("designSystem.fieldHelper")}</p>
                  </div>
                  <div className="space-y-1.5">
                    <StateLabel>{t("designSystem.stateLabels.focus")}</StateLabel>
                    <label htmlFor={`${fieldId}-focus`} className="w-fit cursor-pointer text-sm font-medium">{t("designSystem.fieldLabel")}</label>
                    <div className="ds-state-frame" data-demo-state="focus" inert>
                      <Input id={`${fieldId}-focus`} value={t("designSystem.fieldValue")} readOnly className="ds-force-focus" />
                    </div>
                    <p className="min-h-4 text-xs text-muted-foreground">{t("designSystem.fieldHelper")}</p>
                  </div>
                  <div className="space-y-1.5">
                    <StateLabel>{t("designSystem.stateLabels.disabled")}</StateLabel>
                    <label htmlFor={`${fieldId}-disabled`} className="w-fit text-sm font-medium">{t("designSystem.fieldLabel")}</label>
                    <Input id={`${fieldId}-disabled`} value={t("designSystem.fieldDisabled")} disabled />
                    <p className="min-h-4 text-xs text-muted-foreground">{t("designSystem.fieldHelper")}</p>
                  </div>
                  <div className="space-y-1.5">
                    <StateLabel>{t("designSystem.stateLabels.error")}</StateLabel>
                    <label htmlFor={`${fieldId}-error`} className="w-fit cursor-pointer text-sm font-medium">{t("designSystem.fieldLabel")}</label>
                    <Input id={`${fieldId}-error`} aria-invalid="true" aria-describedby={`${fieldId}-error-message`} />
                    <p id={`${fieldId}-error-message`} className="min-h-4 text-xs text-destructive">{t("designSystem.fieldError")}</p>
                  </div>
                </div>
              </SpecimenCard>

              <SpecimenCard title={t("designSystem.badgeTitle")} description={t("designSystem.badgeDescription")}>
                <div>
                  <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {statusItems.map(({ key, variant }) => (
                      <li key={key}>
                        <Badge variant={variant}>{t(`designSystem.statuses.${key}`)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </SpecimenCard>

              <SpecimenCard title={t("designSystem.cardTitle")} description={t("designSystem.cardDescription")}>
                <div>
                  <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                  <Card className="mt-2">
                    <CardHeader className="pb-3">
                      <CardTitle>{t("designSystem.cardHeading")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{t("designSystem.cardBody")}</p>
                    </CardContent>
                  </Card>
                </div>
              </SpecimenCard>

              <SpecimenCard title={t("designSystem.listRowTitle")} description={t("designSystem.componentsDescription")}>
                <ul className="space-y-2">
                  <li>
                    <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                    <ListRow className="mt-2 border border-border">
                      <span className="min-w-0 flex-1">{t("designSystem.listRowTitle")}</span>
                      <Badge variant="secondary">12</Badge>
                    </ListRow>
                  </li>
                  <li>
                    <StateLabel>{t("designSystem.stateLabels.hover")}</StateLabel>
                    <div className="ds-state-frame mt-2 rounded-xl" data-demo-state="hover" inert>
                      <ListRow interactive>
                        <span className="min-w-0 flex-1">{t("designSystem.listRowTitle")}</span>
                        <span className="max-w-36 text-right text-xs text-muted-foreground">{t("designSystem.listRowMeta")}</span>
                      </ListRow>
                    </div>
                  </li>
                  <li>
                    <StateLabel>{t("designSystem.stateLabels.focus")}</StateLabel>
                    <div className="ds-state-frame mt-2 rounded-xl" data-demo-state="focus" inert>
                      <ListRow interactive className="ds-force-focus">
                        <span className="min-w-0 flex-1">{t("designSystem.listRowTitle")}</span>
                        <span className="max-w-36 text-right text-xs text-muted-foreground">{t("designSystem.listRowMeta")}</span>
                      </ListRow>
                    </div>
                  </li>
                </ul>
              </SpecimenCard>

              <SpecimenCard title={t("designSystem.modalTitle")} description={t("designSystem.modalDescription")}>
                <div>
                  <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                  <DialogSpecimen />
                </div>
              </SpecimenCard>

              <SpecimenCard title={t("designSystem.emptyStateTitle")} description={t("designSystem.emptyStateDescription")}>
                <div>
                  <StateLabel>{t("designSystem.stateLabels.normal")}</StateLabel>
                  <Card className="mt-2">
                    <EmptyState className="px-4">{t("designSystem.emptyMessage")}</EmptyState>
                  </Card>
                </div>
              </SpecimenCard>
            </div>
          </section>

          <section id="ds-accessibility" className="ds-section space-y-4" aria-labelledby="ds-accessibility-title">
            <div className="space-y-1">
              <h2 id="ds-accessibility-title" className="text-lg font-semibold">{t("designSystem.accessibilityTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("designSystem.accessibilityDescription")}</p>
            </div>
            <Card>
              <CardContent className="pt-4 sm:pt-5">
                <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {(["focus", "labels", "targets", "meaning", "motion", "contrast"] as const).map((key) => (
                    <li className="ds-accessibility-item" key={key}>
                      <span className="ds-accessibility-mark" aria-hidden="true">✓</span>
                      <span className="text-sm leading-6">{t(`designSystem.accessibilityItems.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
