'use client';

interface ToolsConfigProps {
  enableWebGrounding: boolean;
  onWebGroundingChange: (enabled: boolean) => void;
}

export default function ToolsConfig({ enableWebGrounding, onWebGroundingChange }: ToolsConfigProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tools</h3>

      <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Web Grounding</p>
          <p className="text-xs text-gray-400">
            Allow the assistant to search the web for real-time information
          </p>
        </div>
        <div className="relative">
          <input
            type="checkbox"
            checked={enableWebGrounding}
            onChange={(e) => onWebGroundingChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-600" />
        </div>
      </label>
    </div>
  );
}
