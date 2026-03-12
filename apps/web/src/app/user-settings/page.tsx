'use client';

import { useUserSettings } from '@/components/user-settings-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { Switch } from '@kit/ui/switch';
import { UnifiedSelector } from '@/components/unified-selector';
import { Badge } from '@kit/ui/badge';
import { Settings } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { cleanTimezone, formatDateTime } from '@kit/lib/date-format';
import { formatCurrency } from '@kit/lib/config';
import DateFormatTest from '@/components/date-format-test';

export default function UserSettingsPage() {
  const { settings, isLoading, updateSetting } = useUserSettings();

  if (isLoading) {
      return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement des paramètres...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

      return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres du Compte</h1>
          <p className="text-muted-foreground">
            Personnalisez votre expérience avec Dose. Les modifications sont sauvegardées automatiquement.
          </p>
        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          Sauvegarde automatique activée
        </div>
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Aperçu des paramètres actuels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Langue (interface):</span>
              <span className="ml-2 font-medium">{settings.language === 'fr' ? 'Français' : 'English'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Locale (dates et nombres):</span>
              <span className="ml-2 font-medium">{settings.formattingLocale === 'en-US' ? 'English (en-US)' : 'Français (fr-FR)'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fuseau horaire:</span>
              <span className="ml-2 font-medium">{settings.timezone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Format de date:</span>
              <span className="ml-2 font-medium">{settings.dateFormat}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Format d'heure:</span>
              <span className="ml-2 font-medium">{settings.timeFormat}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <span className="text-muted-foreground">Exemple:</span>
            <span className="ml-2 font-medium">
              {formatDateTime(new Date())} · {formatCurrency(1234.56)}
            </span>
          </div>
        </div>
        </div>

      <div className="grid gap-6">
        {/* Apparence */}
        <Card>
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>
              Personnalisez l'apparence de l'interface utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedSelector
                label="Thème"
                type="theme"
                items={[
                  { id: 'light', name: 'Clair' },
                  { id: 'dark', name: 'Sombre' },
                  { id: 'auto', name: 'Automatique' },
                ]}
                selectedId={settings.theme || undefined}
                onSelect={(item) => updateSetting('theme', String(item.id) as 'light' | 'dark' | 'auto')}
                placeholder="Select theme"
              />
              <UnifiedSelector
                label="Langue"
                type="language"
                items={[
                  { id: 'fr', name: 'Français' },
                  { id: 'en', name: 'English' },
                ]}
                selectedId={settings.language || undefined}
                onSelect={(item) => updateSetting('language', String(item.id) as 'fr' | 'en')}
                placeholder="Select language"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Langue des menus et libellés de l&apos;interface.
            </p>
          </CardContent>
        </Card>

        {/* Localisation */}
        <Card>
          <CardHeader>
            <CardTitle>Localisation</CardTitle>
            <CardDescription>
              Configurez les paramètres de localisation et de formatage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <UnifiedSelector
                label="Locale (dates et nombres)"
                type="formattingLocale"
                items={[
                  { id: 'fr-FR', name: 'Français (31/12/2024, 1 234,56 €)' },
                  { id: 'en-US', name: 'English (12/31/2024, 1,234.56 €)' },
                ]}
                selectedId={settings.formattingLocale ?? undefined}
                onSelect={(item) => updateSetting('formattingLocale', String(item.id) as 'fr-FR' | 'en-US')}
                placeholder="Select locale"
              />
              <UnifiedSelector
                label="Fuseau horaire"
                type="timezone"
                items={[
                  { id: 'UTC', name: 'UTC (UTC+0)' },
                  { id: 'Europe/London', name: 'Europe/London (UTC+0)' },
                  { id: 'Europe/Paris', name: 'Europe/Paris (UTC+1)' },
                  { id: 'Europe/Berlin', name: 'Europe/Berlin (UTC+1)' },
                  { id: 'Europe/Rome', name: 'Europe/Rome (UTC+1)' },
                  { id: 'Europe/Madrid', name: 'Europe/Madrid (UTC+1)' },
                  { id: 'Europe/Amsterdam', name: 'Europe/Amsterdam (UTC+1)' },
                  { id: 'Europe/Brussels', name: 'Europe/Brussels (UTC+1)' },
                  { id: 'Europe/Zurich', name: 'Europe/Zurich (UTC+1)' },
                  { id: 'Europe/Vienna', name: 'Europe/Vienna (UTC+1)' },
                  { id: 'Europe/Prague', name: 'Europe/Prague (UTC+1)' },
                  { id: 'Europe/Warsaw', name: 'Europe/Warsaw (UTC+1)' },
                  { id: 'Europe/Stockholm', name: 'Europe/Stockholm (UTC+1)' },
                  { id: 'Europe/Oslo', name: 'Europe/Oslo (UTC+1)' },
                  { id: 'Europe/Copenhagen', name: 'Europe/Copenhagen (UTC+1)' },
                  { id: 'Europe/Helsinki', name: 'Europe/Helsinki (UTC+2)' },
                  { id: 'Europe/Athens', name: 'Europe/Athens (UTC+2)' },
                  { id: 'Europe/Bucharest', name: 'Europe/Bucharest (UTC+2)' },
                  { id: 'Europe/Sofia', name: 'Europe/Sofia (UTC+2)' },
                  { id: 'Europe/Moscow', name: 'Europe/Moscow (UTC+3)' },
                  { id: 'America/New_York', name: 'America/New_York (UTC-5)' },
                  { id: 'America/Chicago', name: 'America/Chicago (UTC-6)' },
                  { id: 'America/Denver', name: 'America/Denver (UTC-7)' },
                  { id: 'America/Los_Angeles', name: 'America/Los_Angeles (UTC-8)' },
                  { id: 'America/Toronto', name: 'America/Toronto (UTC-5)' },
                  { id: 'America/Montreal', name: 'America/Montreal (UTC-5)' },
                  { id: 'America/Vancouver', name: 'America/Vancouver (UTC-8)' },
                  { id: 'Asia/Tokyo', name: 'Asia/Tokyo (UTC+9)' },
                  { id: 'Asia/Shanghai', name: 'Asia/Shanghai (UTC+8)' },
                  { id: 'Asia/Hong_Kong', name: 'Asia/Hong_Kong (UTC+8)' },
                  { id: 'Asia/Singapore', name: 'Asia/Singapore (UTC+8)' },
                  { id: 'Asia/Seoul', name: 'Asia/Seoul (UTC+9)' },
                  { id: 'Asia/Dubai', name: 'Asia/Dubai (UTC+4)' },
                  { id: 'Asia/Kolkata', name: 'Asia/Kolkata (UTC+5:30)' },
                  { id: 'Asia/Bangkok', name: 'Asia/Bangkok (UTC+7)' },
                  { id: 'Australia/Sydney', name: 'Australia/Sydney (UTC+10)' },
                  { id: 'Australia/Melbourne', name: 'Australia/Melbourne (UTC+10)' },
                  { id: 'Australia/Perth', name: 'Australia/Perth (UTC+8)' },
                  { id: 'Pacific/Auckland', name: 'Pacific/Auckland (UTC+12)' },
                ]}
                selectedId={settings.timezone || undefined}
                onSelect={(item) => updateSetting('timezone', String(item.id))}
                placeholder="Select timezone"
              />
              <UnifiedSelector
                label="Format de date"
                type="dateFormat"
                items={[
                  { id: 'DD/MM/YYYY', name: 'DD/MM/YYYY (31/12/2024)' },
                  { id: 'MM/DD/YYYY', name: 'MM/DD/YYYY (12/31/2024)' },
                  { id: 'YYYY-MM-DD', name: 'YYYY-MM-DD (2024-12-31)' },
                  { id: 'DD-MM-YYYY', name: 'DD-MM-YYYY (31-12-2024)' },
                  { id: 'MM-DD-YYYY', name: 'MM-DD-YYYY (12-31-2024)' },
                  { id: 'DD.MM.YYYY', name: 'DD.MM.YYYY (31.12.2024)' },
                  { id: 'MM.DD.YYYY', name: 'MM.DD.YYYY (12.31.2024)' },
                  { id: 'DD MMM YYYY', name: 'DD MMM YYYY (31 Dec 2024)' },
                  { id: 'MMM DD, YYYY', name: 'MMM DD, YYYY (Dec 31, 2024)' },
                  { id: 'DD MMMM YYYY', name: 'DD MMMM YYYY (31 December 2024)' },
                  { id: 'MMMM DD, YYYY', name: 'MMMM DD, YYYY (December 31, 2024)' },
                ]}
                selectedId={settings.dateFormat || undefined}
                onSelect={(item) => updateSetting('dateFormat', String(item.id))}
                placeholder="Select date format"
              />
              <UnifiedSelector
                label="Format d'heure"
                type="timeFormat"
                items={[
                  { id: '12h', name: '12 heures' },
                  { id: '24h', name: '24 heures' },
                ]}
                selectedId={settings.timeFormat || undefined}
                onSelect={(item) => updateSetting('timeFormat', String(item.id) as '12h' | '24h')}
                placeholder="Select time format"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configurez vos préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications par email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) => 
                      updateSetting('notifications', { ...settings.notifications, email: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications push</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications push dans le navigateur
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.push}
                    onCheckedChange={(checked) => 
                      updateSetting('notifications', { ...settings.notifications, push: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir des notifications par SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sms}
                    onCheckedChange={(checked) => 
                      updateSetting('notifications', { ...settings.notifications, sms: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications de maintenance programmée
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.maintenance}
                    onCheckedChange={(checked) => 
                      updateSetting('notifications', { ...settings.notifications, maintenance: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications d'alertes critiques
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.alerts}
                    onCheckedChange={(checked) => 
                      updateSetting('notifications', { ...settings.notifications, alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mises à jour</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications de mises à jour système
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.updates}
                    onCheckedChange={(checked) => 
                      updateSetting('notifications', { ...settings.notifications, updates: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau de bord */}
        <Card>
          <CardHeader>
            <CardTitle>Tableau de bord</CardTitle>
            <CardDescription>
              Personnalisez votre tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UnifiedSelector
                label="Vue par défaut"
                type="view"
                items={[
                  { id: 'overview', name: "Vue d'ensemble" },
                  { id: 'detailed', name: 'Vue détaillée' },
                  { id: 'compact', name: 'Vue compacte' },
                ]}
                selectedId={settings.dashboard.defaultView || undefined}
                onSelect={(item) => updateSetting('dashboard', { ...settings.dashboard, defaultView: String(item.id) })}
                placeholder="Select view"
              />
              <UnifiedSelector
                label="Intervalle de rafraîchissement"
                type="interval"
                items={[
                  { id: '10', name: '10 secondes' },
                  { id: '15', name: '15 secondes' },
                  { id: '30', name: '30 secondes' },
                  { id: '60', name: '1 minute' },
                  { id: '120', name: '2 minutes' },
                  { id: '300', name: '5 minutes' },
                  { id: '600', name: '10 minutes' },
                  { id: '900', name: '15 minutes' },
                  { id: '1800', name: '30 minutes' },
                  { id: '3600', name: '1 heure' },
                ]}
                selectedId={settings.dashboard.refreshInterval.toString()}
                onSelect={(item) => updateSetting('dashboard', { ...settings.dashboard, refreshInterval: parseInt(String(item.id)) })}
                placeholder="Select interval"
              />
            </div>

            <div className="space-y-2">
              <Label>Widgets du tableau de bord</Label>
              <div className="flex flex-wrap gap-2">
                {['recent_activities', 'maintenance_schedule', 'alerts', 'performance_metrics'].map((widget) => (
                  <Badge
                    key={widget}
                    variant={settings.dashboard.widgets.includes(widget) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const newWidgets = settings.dashboard.widgets.includes(widget)
                        ? settings.dashboard.widgets.filter(w => w !== widget)
                        : [...settings.dashboard.widgets, widget];
                      updateSetting('dashboard', { ...settings.dashboard, widgets: newWidgets });
                    }}
                  >
                    {widget.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Préférences */}
        <Card>
          <CardHeader>
            <CardTitle>Préférences</CardTitle>
            <CardDescription>
              Configurez vos préférences d'utilisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sauvegarde automatique</Label>
                    <p className="text-sm text-muted-foreground">
                      Sauvegarder automatiquement les modifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.autoSave}
                    onCheckedChange={(checked) => 
                      updateSetting('preferences', { ...settings.preferences, autoSave: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmer les actions</Label>
                    <p className="text-sm text-muted-foreground">
                      Demander confirmation avant les actions importantes
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.confirmActions}
                    onCheckedChange={(checked) => 
                      updateSetting('preferences', { ...settings.preferences, confirmActions: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Afficher les info-bulles</Label>
                    <p className="text-sm text-muted-foreground">
                      Afficher les info-bulles d'aide
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.showTooltips}
                    onCheckedChange={(checked) => 
                      updateSetting('preferences', { ...settings.preferences, showTooltips: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mode compact</Label>
                    <p className="text-sm text-muted-foreground">
                      Interface plus compacte pour économiser l'espace
                    </p>
                  </div>
                  <Switch
                    checked={settings.preferences.compactMode}
                    onCheckedChange={(checked) => 
                      updateSetting('preferences', { ...settings.preferences, compactMode: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Date Format Test */}
        <DateFormatTest />
      </div>
      </div>
    </AppLayout>
  );
}