export interface IStep {
  time: string;
  from_prev?: number;
  from_start?: number;
}

export interface IDocument {
  application: string;
  flow: string;
  created_at: Date | string;
  updated_at: Date | string;
  synced: boolean;
  data: {[key: string]: any};
  steps: {[key: string]: IStep};
  step_logs: {
    step: string,
    data: Date | string
  }[]
}