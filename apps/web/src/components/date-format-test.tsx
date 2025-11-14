'use client';

import { useDateFormat } from '@kit/hooks/use-date-format';
import { useUserSettings } from '@/components/user-settings-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';

export default function DateFormatTest() {
  const { formatDate, formatDateTime, formatTime } = useDateFormat();
  const { updateSetting, settings } = useUserSettings();
  
  const testDate = new Date('2025-01-15T14:30:00Z');
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Date Format Test</CardTitle>
          <CardDescription>
            This component demonstrates reactive date formatting that updates when user settings change.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Current Settings:</h4>
              <p>Language: {settings.language}</p>
              <p>Timezone: {settings.timezone}</p>
              <p>Time Format: {settings.timeFormat}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Formatted Dates:</h4>
              <p>Date: {formatDate(testDate)}</p>
              <p>Date & Time: {formatDateTime(testDate)}</p>
              <p>Time: {formatTime(testDate)}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => updateSetting('language', settings.language === 'fr' ? 'en' : 'fr')}
              variant="outline"
            >
              Toggle Language ({settings.language === 'fr' ? 'EN' : 'FR'})
            </Button>
            <Button 
              onClick={() => updateSetting('timeFormat', settings.timeFormat === '12h' ? '24h' : '12h')}
              variant="outline"
            >
              Toggle Time Format ({settings.timeFormat === '12h' ? '24h' : '12h'})
            </Button>
            <Button 
              onClick={() => updateSetting('timezone', settings.timezone === 'Europe/Paris' ? 'America/New_York' : 'Europe/Paris')}
              variant="outline"
            >
              Toggle Timezone ({settings.timezone === 'Europe/Paris' ? 'NYC' : 'Paris'})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}