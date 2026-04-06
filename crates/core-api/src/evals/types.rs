use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalOverviewRecord {
    pub dataset_count: usize,
    pub run_count: usize,
    pub trace_count: usize,
    pub fallback_trace_count: usize,
    pub failed_run_count: usize,
    pub latest_run_at: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalDatasetManifestRecord {
    pub id: String,
    pub title: String,
    pub scope: String,
    pub target_type: String,
    pub description: String,
    pub case_ids: Vec<String>,
    pub rubric_ids: Vec<String>,
    pub default_judge_config: Option<Value>,
    pub owner: String,
    pub version: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalRubricRecord {
    pub id: String,
    pub label: String,
    pub description: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalMemoryStrategyRecord {
    pub id: String,
    pub label: String,
    pub description: String,
    pub keep_recent_turns: Option<usize>,
    pub truncate_memory_chars: Option<usize>,
    pub drop_memory: bool,
    pub prompt_instruction: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalPromptVariantRecord {
    pub id: String,
    pub label: String,
    pub description: String,
    pub instruction: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalExperimentConfigRecord {
    pub provider_override: Option<String>,
    pub judge_model_override: Option<String>,
    pub prompt_variant: Option<String>,
    pub memory_policy_variant: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalExperimentPresetRecord {
    pub id: String,
    pub title: String,
    pub description: String,
    pub dataset_id: String,
    pub mode: String,
    pub experiment_label: Option<String>,
    pub baseline: Option<EvalExperimentConfigRecord>,
    pub candidate: Option<EvalExperimentConfigRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalExpectationRecord {
    pub hard_rules: Vec<String>,
    pub judge_rubrics: Vec<String>,
    pub forbidden_outcomes: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalCaseRecord {
    pub id: String,
    pub dataset_id: String,
    pub target_type: String,
    pub title: String,
    pub description: String,
    pub tags: Vec<String>,
    pub priority: String,
    pub input: Value,
    pub expectations: EvalExpectationRecord,
    pub baseline_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalDatasetDetailRecord {
    pub manifest: EvalDatasetManifestRecord,
    pub cases: Vec<EvalCaseRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalFailureTagRecord {
    pub key: String,
    pub label: String,
    pub count: Option<u32>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalScoreRecord {
    pub key: String,
    pub label: String,
    pub value: f32,
    pub rationale: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalCaseComparisonRecord {
    pub outcome: String,
    pub baseline_run_id: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalCaseResultRecord {
    pub case_id: String,
    pub status: String,
    pub output: Option<String>,
    pub scores: Vec<EvalScoreRecord>,
    pub failure_tags: Vec<EvalFailureTagRecord>,
    pub judge_rationale: Option<String>,
    pub rule_violations: Vec<String>,
    pub trace_ids: Vec<String>,
    pub comparison: Option<EvalCaseComparisonRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalRunSummaryRecord {
    pub case_count: usize,
    pub completed_cases: usize,
    pub passed_cases: usize,
    pub failed_cases: usize,
    pub scaffolded_cases: usize,
    pub top_failure_tags: Vec<EvalFailureTagRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalRunRecord {
    pub id: String,
    pub dataset_id: String,
    pub mode: String,
    pub experiment_label: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub status: String,
    pub runner_version: String,
    pub judge_version: String,
    pub effective_provider_model: Option<String>,
    pub effective_judge_model: Option<String>,
    pub provider_override: Option<String>,
    pub judge_model_override: Option<String>,
    pub prompt_variant: Option<String>,
    pub memory_policy_variant: Option<String>,
    pub summary: EvalRunSummaryRecord,
    pub case_results: Vec<EvalCaseResultRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunEvalDatasetRequest {
    pub dataset_id: String,
    pub mode: Option<String>,
    pub experiment_label: Option<String>,
    pub provider_override: Option<String>,
    pub judge_model_override: Option<String>,
    pub prompt_variant: Option<String>,
    pub memory_policy_variant: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareEvalRunsRequest {
    pub baseline_run_id: String,
    pub candidate_run_id: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunPairwiseEvalRequest {
    pub dataset_id: String,
    pub experiment_label: Option<String>,
    pub baseline_provider_override: Option<String>,
    pub baseline_judge_model_override: Option<String>,
    pub baseline_prompt_variant: Option<String>,
    pub baseline_memory_policy_variant: Option<String>,
    pub candidate_provider_override: Option<String>,
    pub candidate_judge_model_override: Option<String>,
    pub candidate_prompt_variant: Option<String>,
    pub candidate_memory_policy_variant: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalExperimentRunResponse {
    pub preset: EvalExperimentPresetRecord,
    pub single_run: Option<EvalRunRecord>,
    pub pairwise_run: Option<PairwiseEvalRunResponse>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalFailureTagDeltaRecord {
    pub key: String,
    pub label: String,
    pub baseline_count: u32,
    pub candidate_count: u32,
    pub delta: i32,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalCaseDeltaRecord {
    pub case_id: String,
    pub outcome: String,
    pub score_delta: f32,
    pub baseline_status: Option<String>,
    pub candidate_status: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalExperimentReportRecord {
    pub id: String,
    pub created_at: String,
    pub preset_id: String,
    pub preset_title: String,
    pub dataset_id: String,
    pub experiment_label: Option<String>,
    pub mode: String,
    pub single_run_id: Option<String>,
    pub baseline_run_id: Option<String>,
    pub candidate_run_id: Option<String>,
    pub comparison_id: Option<String>,
    pub summary: EvalComparisonSummaryRecord,
    pub top_case_deltas: Vec<EvalCaseDeltaRecord>,
    pub failure_tag_deltas: Vec<EvalFailureTagDeltaRecord>,
    pub keep: Vec<String>,
    pub regressions: Vec<String>,
    pub rollback: Vec<String>,
    pub recommendations: Vec<String>,
    pub decision_status: String,
    pub applied_action: Option<String>,
    pub decided_at: Option<String>,
    pub decided_by: Option<String>,
    pub notes: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEvalReportDecisionRequest {
    pub decision_status: String,
    pub applied_action: Option<String>,
    pub decided_by: Option<String>,
    pub note: Option<String>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalRunListQuery {
    pub dataset_id: Option<String>,
    pub experiment_label: Option<String>,
    pub provider_model: Option<String>,
    pub judge_model: Option<String>,
    pub prompt_variant: Option<String>,
    pub memory_policy_variant: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalCaseComparisonSummaryRecord {
    pub case_id: String,
    pub baseline_status: Option<String>,
    pub candidate_status: Option<String>,
    pub baseline_output: Option<String>,
    pub candidate_output: Option<String>,
    pub baseline_score_total: f32,
    pub candidate_score_total: f32,
    pub score_delta: f32,
    pub baseline_scores: Vec<EvalScoreRecord>,
    pub candidate_scores: Vec<EvalScoreRecord>,
    pub baseline_failure_tags: Vec<EvalFailureTagRecord>,
    pub candidate_failure_tags: Vec<EvalFailureTagRecord>,
    pub baseline_rule_violations: Vec<String>,
    pub candidate_rule_violations: Vec<String>,
    pub baseline_trace_ids: Vec<String>,
    pub candidate_trace_ids: Vec<String>,
    pub outcome: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalComparisonSummaryRecord {
    pub total_cases: usize,
    pub wins: usize,
    pub losses: usize,
    pub ties: usize,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalComparisonRecord {
    pub id: String,
    pub created_at: String,
    pub experiment_label: Option<String>,
    pub baseline_run_id: String,
    pub candidate_run_id: String,
    pub baseline_dataset_id: String,
    pub candidate_dataset_id: String,
    pub baseline_provider_model: Option<String>,
    pub candidate_provider_model: Option<String>,
    pub baseline_judge_model: Option<String>,
    pub candidate_judge_model: Option<String>,
    pub baseline_prompt_variant: Option<String>,
    pub candidate_prompt_variant: Option<String>,
    pub baseline_memory_policy_variant: Option<String>,
    pub candidate_memory_policy_variant: Option<String>,
    pub summary: EvalComparisonSummaryRecord,
    pub case_comparisons: Vec<EvalCaseComparisonSummaryRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairwiseEvalRunResponse {
    pub baseline_run: EvalRunRecord,
    pub candidate_run: EvalRunRecord,
    pub comparison: EvalComparisonRecord,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalComparisonListQuery {
    pub dataset_id: Option<String>,
    pub experiment_label: Option<String>,
    pub provider_model: Option<String>,
    pub judge_model: Option<String>,
    pub prompt_variant: Option<String>,
    pub memory_policy_variant: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationTraceProviderRecord {
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub mode: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationTraceInputRecord {
    pub trigger: Option<String>,
    pub world_context_snapshot: Option<Value>,
    pub activity_snapshot: Option<Value>,
    pub memory_snapshot: Option<Value>,
    pub prompt_messages: Vec<TracePromptMessageRecord>,
    pub request_config: Option<Value>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TracePromptMessageRecord {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationTraceOutputRecord {
    pub raw_output: Option<String>,
    pub normalized_output: Option<String>,
    pub fallback_reason: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationTraceEvaluationSummaryRecord {
    pub scores: Vec<EvalScoreRecord>,
    pub failure_tags: Vec<EvalFailureTagRecord>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationTraceRecord {
    pub id: String,
    pub created_at: String,
    pub source: String,
    pub status: String,
    pub conversation_id: Option<String>,
    pub character_id: Option<String>,
    pub related_character_ids: Vec<String>,
    pub user_id: Option<String>,
    pub job_id: Option<String>,
    pub provider: Option<GenerationTraceProviderRecord>,
    pub latency_ms: Option<u64>,
    pub history_window_size: Option<usize>,
    pub input: GenerationTraceInputRecord,
    pub output: GenerationTraceOutputRecord,
    pub evaluation_summary: Option<GenerationTraceEvaluationSummaryRecord>,
}
