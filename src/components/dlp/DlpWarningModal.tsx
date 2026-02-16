'use client';

import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface DlpWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  findings?: Array<{ infoType: string; quote?: string }>;
}

export default function DlpWarningModal({ isOpen, onClose, findings }: DlpWarningModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sensitive Data Detected"
      footer={
        <Button variant="primary" onClick={onClose}>
          Understood
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 shrink-0 text-red-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-800 dark:text-red-200">
            Your message contains sensitive personal information and cannot be sent.
            Please remove the sensitive data and try again.
          </p>
        </div>

        {findings && findings.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Detected information types:
            </p>
            <ul className="space-y-1">
              {findings.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-medium">{f.infoType}</span>
                  {f.quote && (
                    <span className="text-gray-400">
                      (&quot;{f.quote.substring(0, 20)}...&quot;)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
