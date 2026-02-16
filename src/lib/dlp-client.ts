import { DlpServiceClient } from '@google-cloud/dlp';
import type { DlpInspectResponse, DlpFinding, DlpLikelihood } from '@/types/dlp';
import { DLP_INFO_TYPES } from './constants';

let dlpClient: DlpServiceClient | null = null;

function getDlpClient(): DlpServiceClient {
  if (!dlpClient) {
    const dlpLocation = process.env.DLP_LOCATION || 'asia-northeast3';
    dlpClient = new DlpServiceClient({
      apiEndpoint: `dlp.${dlpLocation}.rep.googleapis.com`,
    });
  }
  return dlpClient;
}

export async function inspectText(text: string): Promise<DlpInspectResponse> {
  const client = getDlpClient();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const dlpLocation = process.env.DLP_LOCATION || 'asia-northeast3';
  const minLikelihood = (process.env.DLP_MIN_LIKELIHOOD || 'POSSIBLE') as DlpLikelihood;

  const [response] = await client.inspectContent({
    parent: `projects/${projectId}/locations/${dlpLocation}`,
    item: {
      value: text,
    },
    inspectConfig: {
      infoTypes: DLP_INFO_TYPES.map((type) => ({ name: type })),
      minLikelihood: minLikelihood as unknown as number,
      includeQuote: true,
    },
  });

  const findings: DlpFinding[] = (response.result?.findings || []).map((f) => ({
    infoType: f.infoType?.name || 'UNKNOWN',
    likelihood: (f.likelihood?.toString() || 'LIKELIHOOD_UNSPECIFIED') as DlpLikelihood,
    location: {
      startIndex: Number(f.location?.codepointRange?.start || 0),
      endIndex: Number(f.location?.codepointRange?.end || 0),
    },
    quote: f.quote || undefined,
  }));

  return {
    safe: findings.length === 0,
    findings,
  };
}
