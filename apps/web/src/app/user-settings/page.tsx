'use client';

import { useUserSettings } from '@/components/user-settings-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { Switch } from '@kit/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Badge } from '@kit/ui/badge';
import { Settings } from 'lucide-react';
import AppLayout from '@/components/app-layout';
import { cleanTimezone, formatDateTime } from '@kit/lib/date-format';
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
            <div>
              <span className="text-muted-foreground">Langue:</span>
              <span className="ml-2 font-medium">{settings.language === 'fr' ? 'Français' : 'English'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <span className="text-muted-foreground">Exemple:</span>
            <span className="ml-2 font-medium">
              {(() => {
                try {
                  // Clean the timezone value to remove any potential prefixes
                  const cleanedTimezone = cleanTimezone(settings.timezone);
                  
                  return formatDateTime(new Date());
                } catch (error) {
                  console.error('Error formatting date with timezone:', error);
                  // Fallback to default formatting
                  return formatDateTime(new Date());
                }
              })()}
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
              <div className="space-y-2">
                <Label htmlFor="theme">Thème</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value: 'light' | 'dark' | 'auto') => updateSetting('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Clair</SelectItem>
                    <SelectItem value="dark">Sombre</SelectItem>
                    <SelectItem value="auto">Automatique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value: 'fr' | 'en') => updateSetting('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => updateSetting('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Berlin">Europe/Berlin (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Rome">Europe/Rome (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Madrid">Europe/Madrid (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Amsterdam">Europe/Amsterdam (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Brussels">Europe/Brussels (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Zurich">Europe/Zurich (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Vienna">Europe/Vienna (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Prague">Europe/Prague (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Warsaw">Europe/Warsaw (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Stockholm">Europe/Stockholm (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Oslo">Europe/Oslo (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Copenhagen">Europe/Copenhagen (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Helsinki">Europe/Helsinki (UTC+2)</SelectItem>
                    <SelectItem value="Europe/Athens">Europe/Athens (UTC+2)</SelectItem>
                    <SelectItem value="Europe/Bucharest">Europe/Bucharest (UTC+2)</SelectItem>
                    <SelectItem value="Europe/Sofia">Europe/Sofia (UTC+2)</SelectItem>
                    <SelectItem value="Europe/Moscow">Europe/Moscow (UTC+3)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                    <SelectItem value="America/Chicago">America/Chicago (UTC-6)</SelectItem>
                    <SelectItem value="America/Denver">America/Denver (UTC-7)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (UTC-8)</SelectItem>
                    <SelectItem value="America/Toronto">America/Toronto (UTC-5)</SelectItem>
                    <SelectItem value="America/Montreal">America/Montreal (UTC-5)</SelectItem>
                    <SelectItem value="America/Vancouver">America/Vancouver (UTC-8)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                    <SelectItem value="Asia/Hong_Kong">Asia/Hong_Kong (UTC+8)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (UTC+8)</SelectItem>
                    <SelectItem value="Asia/Seoul">Asia/Seoul (UTC+9)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</SelectItem>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok (UTC+7)</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney (UTC+10)</SelectItem>
                    <SelectItem value="Australia/Melbourne">Australia/Melbourne (UTC+10)</SelectItem>
                    <SelectItem value="Australia/Perth">Australia/Perth (UTC+8)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Pacific/Auckland (UTC+12)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Format de date</Label>
                <Select
                  value={settings.dateFormat}
                  onValueChange={(value) => updateSetting('dateFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                    <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</SelectItem>
                    <SelectItem value="MM-DD-YYYY">MM-DD-YYYY (12-31-2024)</SelectItem>
                    <SelectItem value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</SelectItem>
                    <SelectItem value="MM.DD.YYYY">MM.DD.YYYY (12.31.2024)</SelectItem>
                    <SelectItem value="DD MMM YYYY">DD MMM YYYY (31 Dec 2024)</SelectItem>
                    <SelectItem value="MMM DD, YYYY">MMM DD, YYYY (Dec 31, 2024)</SelectItem>
                    <SelectItem value="DD MMMM YYYY">DD MMMM YYYY (31 December 2024)</SelectItem>
                    <SelectItem value="MMMM DD, YYYY">MMMM DD, YYYY (December 31, 2024)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat">Format d'heure</Label>
                <Select
                  value={settings.timeFormat}
                  onValueChange={(value: '12h' | '24h') => updateSetting('timeFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 heures</SelectItem>
                    <SelectItem value="24h">24 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="defaultView">Vue par défaut</Label>
                <Select
                  value={settings.dashboard.defaultView}
                  onValueChange={(value) => 
                    updateSetting('dashboard', { ...settings.dashboard, defaultView: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Vue d'ensemble</SelectItem>
                    <SelectItem value="detailed">Vue détaillée</SelectItem>
                    <SelectItem value="compact">Vue compacte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refreshInterval">Intervalle de rafraîchissement</Label>
                <Select
                  value={settings.dashboard.refreshInterval.toString()}
                  onValueChange={(value) => 
                    updateSetting('dashboard', { 
                      ...settings.dashboard, 
                      refreshInterval: parseInt(value) 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 secondes</SelectItem>
                    <SelectItem value="15">15 secondes</SelectItem>
                    <SelectItem value="30">30 secondes</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="900">15 minutes</SelectItem>
                    <SelectItem value="1800">30 minutes</SelectItem>
                    <SelectItem value="3600">1 heure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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