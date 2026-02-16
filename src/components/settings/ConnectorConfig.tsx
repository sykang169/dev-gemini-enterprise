'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ConnectorConfigProps {
  projectId: string;
  location: string;
  appId: string;
  onSave: (config: { projectId: string; location: string; appId: string }) => void;
}

export default function ConnectorConfig({
  projectId: initialProjectId,
  location: initialLocation,
  appId: initialAppId,
  onSave,
}: ConnectorConfigProps) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [location, setLocation] = useState(initialLocation);
  const [appId, setAppId] = useState(initialAppId);

  const handleSave = () => {
    onSave({ projectId, location, appId });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        Connection Settings
      </h3>

      <Input
        label="Google Cloud Project ID"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        placeholder="my-project-id"
        id="project-id"
      />

      <Input
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="global"
        id="location"
      />

      <Input
        label="Gemini App ID"
        value={appId}
        onChange={(e) => setAppId(e.target.value)}
        placeholder="my-gemini-app"
        id="app-id"
      />

      <Button onClick={handleSave}>Save Configuration</Button>
    </div>
  );
}
