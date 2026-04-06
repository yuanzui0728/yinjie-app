use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::de::DeserializeOwned;

use crate::{evals::types::EvalDatasetManifestRecord, runtime_paths};

pub fn load_dataset_manifests(root: &Path) -> Vec<EvalDatasetManifestRecord> {
    let manifest_dir = root.join("evals").join("manifests");
    read_json_collection::<EvalDatasetManifestRecord>(&manifest_dir)
}

pub fn load_rubrics(root: &Path) -> Vec<crate::evals::types::EvalRubricRecord> {
    let rubric_dir = root.join("evals").join("rubrics");
    read_json_collection::<crate::evals::types::EvalRubricRecord>(&rubric_dir)
}

pub fn load_memory_strategies(root: &Path) -> Vec<crate::evals::types::EvalMemoryStrategyRecord> {
    let strategy_dir = root.join("evals").join("strategies");
    read_json_collection::<crate::evals::types::EvalMemoryStrategyRecord>(&strategy_dir)
}

pub fn load_prompt_variants(root: &Path) -> Vec<crate::evals::types::EvalPromptVariantRecord> {
    let variants_dir = root.join("evals").join("prompt-variants");
    read_json_collection::<crate::evals::types::EvalPromptVariantRecord>(&variants_dir)
}

pub fn load_experiment_presets(root: &Path) -> Vec<crate::evals::types::EvalExperimentPresetRecord> {
    let experiments_dir = root.join("evals").join("experiments");
    read_json_collection::<crate::evals::types::EvalExperimentPresetRecord>(&experiments_dir)
}

pub fn load_dataset_manifest(root: &Path, dataset_id: &str) -> Option<EvalDatasetManifestRecord> {
    load_dataset_manifests(root)
        .into_iter()
        .find(|manifest| manifest.id == dataset_id)
}

pub fn load_dataset_cases(
    root: &Path,
    dataset_id: &str,
) -> Vec<crate::evals::types::EvalCaseRecord> {
    let cases_dir = root.join("evals").join("cases");
    let mut cases = read_json_collection::<crate::evals::types::EvalCaseRecord>(&cases_dir)
        .into_iter()
        .filter(|case_record| case_record.dataset_id == dataset_id)
        .collect::<Vec<_>>();
    cases.sort_by(|left, right| left.id.cmp(&right.id));
    cases
}

pub fn load_eval_runs(database_path: &Path) -> Vec<crate::evals::types::EvalRunRecord> {
    let runs_dir = runtime_paths::eval_runs_dir(database_path);
    let mut runs = read_json_collection::<crate::evals::types::EvalRunRecord>(&runs_dir);
    runs.sort_by(|left, right| right.started_at.cmp(&left.started_at));
    runs
}

pub fn load_eval_run(
    database_path: &Path,
    run_id: &str,
) -> Option<crate::evals::types::EvalRunRecord> {
    read_json_file::<crate::evals::types::EvalRunRecord>(&runtime_paths::eval_runs_dir(database_path).join(format!("{run_id}.json")))
}

pub fn load_eval_comparisons(
    database_path: &Path,
) -> Vec<crate::evals::types::EvalComparisonRecord> {
    let comparisons_dir = runtime_paths::eval_comparisons_dir(database_path);
    let mut comparisons = read_json_collection::<crate::evals::types::EvalComparisonRecord>(&comparisons_dir);
    comparisons.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    comparisons
}

pub fn load_eval_reports(
    database_path: &Path,
) -> Vec<crate::evals::types::EvalExperimentReportRecord> {
    let reports_dir = runtime_paths::eval_reports_dir(database_path);
    let mut reports = read_json_collection::<crate::evals::types::EvalExperimentReportRecord>(&reports_dir);
    reports.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    reports
}

pub fn load_eval_report(
    database_path: &Path,
    report_id: &str,
) -> Option<crate::evals::types::EvalExperimentReportRecord> {
    read_json_file::<crate::evals::types::EvalExperimentReportRecord>(
        &runtime_paths::eval_reports_dir(database_path).join(format!("{report_id}.json")),
    )
}

pub fn load_generation_traces(database_path: &Path) -> Vec<crate::evals::types::GenerationTraceRecord> {
    let traces_dir = runtime_paths::eval_traces_dir(database_path);
    let mut traces = read_json_collection::<crate::evals::types::GenerationTraceRecord>(&traces_dir);
    traces.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    traces
}

pub fn load_generation_trace(
    database_path: &Path,
    trace_id: &str,
) -> Option<crate::evals::types::GenerationTraceRecord> {
    read_json_file::<crate::evals::types::GenerationTraceRecord>(&runtime_paths::eval_traces_dir(database_path).join(format!("{trace_id}.json")))
}

pub fn persist_eval_run(
    database_path: &Path,
    run: &crate::evals::types::EvalRunRecord,
) -> Result<(), String> {
    let runs_dir = runtime_paths::eval_runs_dir(database_path);
    fs::create_dir_all(&runs_dir).map_err(|error| format!("failed to create eval runs directory: {error}"))?;
    let path = runs_dir.join(format!("{}.json", run.id));
    let body = serde_json::to_vec_pretty(run).map_err(|error| format!("failed to serialize eval run: {error}"))?;
    fs::write(path, body).map_err(|error| format!("failed to persist eval run: {error}"))
}

pub fn persist_generation_trace(
    database_path: &Path,
    trace: &crate::evals::types::GenerationTraceRecord,
) -> Result<(), String> {
    let traces_dir = runtime_paths::eval_traces_dir(database_path);
    fs::create_dir_all(&traces_dir)
        .map_err(|error| format!("failed to create eval traces directory: {error}"))?;
    let path = traces_dir.join(format!("{}.json", trace.id));
    let body = serde_json::to_vec_pretty(trace)
        .map_err(|error| format!("failed to serialize generation trace: {error}"))?;
    fs::write(path, body).map_err(|error| format!("failed to persist generation trace: {error}"))
}

pub fn persist_eval_comparison(
    database_path: &Path,
    comparison: &crate::evals::types::EvalComparisonRecord,
) -> Result<(), String> {
    let comparisons_dir = runtime_paths::eval_comparisons_dir(database_path);
    fs::create_dir_all(&comparisons_dir)
        .map_err(|error| format!("failed to create eval comparisons directory: {error}"))?;
    let path = comparisons_dir.join(format!("{}.json", comparison.id));
    let body = serde_json::to_vec_pretty(comparison)
        .map_err(|error| format!("failed to serialize eval comparison: {error}"))?;
    fs::write(path, body).map_err(|error| format!("failed to persist eval comparison: {error}"))
}

pub fn persist_eval_report(
    database_path: &Path,
    report: &crate::evals::types::EvalExperimentReportRecord,
) -> Result<(), String> {
    let reports_dir = runtime_paths::eval_reports_dir(database_path);
    fs::create_dir_all(&reports_dir)
        .map_err(|error| format!("failed to create eval reports directory: {error}"))?;
    let path = reports_dir.join(format!("{}.json", report.id));
    let body = serde_json::to_vec_pretty(report)
        .map_err(|error| format!("failed to serialize eval report: {error}"))?;
    fs::write(path, body).map_err(|error| format!("failed to persist eval report: {error}"))
}

fn read_json_collection<T>(dir: &Path) -> Vec<T>
where
    T: DeserializeOwned,
{
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    let mut files = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.extension().and_then(|value| value.to_str()) == Some("json"))
        .collect::<Vec<PathBuf>>();
    files.sort();

    files.into_iter().filter_map(|path| read_json_file::<T>(&path)).collect()
}

fn read_json_file<T>(path: &Path) -> Option<T>
where
    T: DeserializeOwned,
{
    let body = fs::read_to_string(path).ok()?;
    serde_json::from_str::<T>(&body).ok()
}
