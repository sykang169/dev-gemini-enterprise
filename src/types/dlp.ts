export interface DlpInspectRequest {
  text: string;
  minLikelihood?: DlpLikelihood;
}

export type DlpLikelihood =
  | 'LIKELIHOOD_UNSPECIFIED'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY';

export interface DlpInspectResponse {
  safe: boolean;
  findings: DlpFinding[];
}

export interface DlpFinding {
  infoType: string;
  likelihood: DlpLikelihood;
  location: {
    startIndex: number;
    endIndex: number;
  };
  quote?: string;
}
