use std::{collections::HashSet, future::Future, path::Path};
use std::time::{SystemTime, UNIX_EPOCH};

use axum::{
    extract::{Path as RoutePath, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::Value;

use crate::{
    app_state::AppState,
    error::{ApiError, ApiResult},
    evals::{
        storage,
        types::{
            CompareEvalRunsRequest, EvalCaseComparisonSummaryRecord, EvalCaseResultRecord,
            EvalComparisonListQuery, EvalComparisonRecord, EvalComparisonSummaryRecord,
            EvalDatasetDetailRecord, EvalExperimentPresetRecord, EvalExperimentRunResponse,
            EvalCaseDeltaRecord, EvalExperimentReportRecord, EvalFailureTagDeltaRecord,
            EvalFailureTagRecord, EvalMemoryStrategyRecord, EvalOverviewRecord,
            EvalPromptVariantRecord, EvalRunListQuery, EvalRunRecord, EvalRunSummaryRecord,
            EvalScoreRecord, EvalRubricRecord, GenerationTraceEvaluationSummaryRecord,
            PairwiseEvalRunResponse, RunEvalDatasetRequest, RunPairwiseEvalRequest,
            UpdateEvalReportDecisionRequest,
        },
    },
    generation,
    models::{CharacterRecord, ConversationRecord, MessageRecord, WorldContextRecord},
    runtime_paths,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TraceListQuery {
    source: Option<String>,
    status: Option<String>,
    character_id: Option<String>,
    limit: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ComparisonListQuery {
    dataset_id: Option<String>,
    experiment_label: Option<String>,
    provider_model: Option<String>,
    judge_model: Option<String>,
    prompt_variant: Option<String>,
    memory_policy_variant: Option<String>,
}

#[derive(Clone)]
struct EvalExecutionConfig {
    provider_override: Option<String>,
    judge_model_override: Option<String>,
    prompt_variant: Option<String>,
    memory_strategy: Option<EvalMemoryStrategyRecord>,
    prompt_variant_asset: Option<EvalPromptVariantRecord>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/overview", get(eval_overview))
        .route("/datasets", get(list_datasets))
        .route("/datasets/:id", get(get_dataset))
        .route("/strategies", get(list_strategies))
        .route("/prompt-variants", get(list_prompt_variants))
        .route("/experiments", get(list_experiments))
        .route("/experiments/:id/run", axum::routing::post(run_experiment))
        .route("/reports", get(list_reports))
        .route("/reports/:id/decision", axum::routing::post(update_report_decision))
        .route("/runs", get(list_runs).post(run_dataset))
        .route("/runs/:id", get(get_run))
        .route("/comparisons", get(list_comparisons))
        .route("/compare", axum::routing::post(compare_runs))
        .route("/compare/run", axum::routing::post(run_pairwise_compare))
        .route("/traces", get(list_traces))
        .route("/traces/:id", get(get_trace))
}

async fn eval_overview(State(state): State<AppState>) -> Json<EvalOverviewRecord> {
    let datasets_root = datasets_root();
    let manifests = storage::load_dataset_manifests(&datasets_root);
    let runs = storage::load_eval_runs(&state.database_path);
    let traces = storage::load_generation_traces(&state.database_path);

    Json(EvalOverviewRecord {
        dataset_count: manifests.len(),
        run_count: runs.len(),
        trace_count: traces.len(),
        fallback_trace_count: traces.iter().filter(|trace| trace.status == "fallback").count(),
        failed_run_count: runs.iter().filter(|run| run.status == "failed").count(),
        latest_run_at: runs.first().map(|run| run.started_at.clone()),
    })
}

async fn list_datasets(State(_state): State<AppState>) -> Json<Vec<crate::evals::types::EvalDatasetManifestRecord>> {
    Json(storage::load_dataset_manifests(&datasets_root()))
}

async fn get_dataset(
    State(_state): State<AppState>,
    RoutePath(id): RoutePath<String>,
) -> ApiResult<Json<EvalDatasetDetailRecord>> {
    let datasets_root = datasets_root();
    let manifest = storage::load_dataset_manifest(&datasets_root, &id)
        .ok_or_else(|| ApiError::not_found(format!("Unknown eval dataset: {id}")))?;
    let cases = storage::load_dataset_cases(&datasets_root, &id);

    Ok(Json(EvalDatasetDetailRecord { manifest, cases }))
}

async fn list_strategies(State(_state): State<AppState>) -> Json<Vec<EvalMemoryStrategyRecord>> {
    Json(storage::load_memory_strategies(&datasets_root()))
}

async fn list_prompt_variants(State(_state): State<AppState>) -> Json<Vec<EvalPromptVariantRecord>> {
    Json(storage::load_prompt_variants(&datasets_root()))
}

async fn list_experiments(State(_state): State<AppState>) -> Json<Vec<EvalExperimentPresetRecord>> {
    Json(storage::load_experiment_presets(&datasets_root()))
}

async fn list_reports(State(state): State<AppState>) -> Json<Vec<EvalExperimentReportRecord>> {
    Json(storage::load_eval_reports(&state.database_path))
}

async fn update_report_decision(
    State(state): State<AppState>,
    RoutePath(id): RoutePath<String>,
    Json(payload): Json<UpdateEvalReportDecisionRequest>,
) -> ApiResult<Json<EvalExperimentReportRecord>> {
    let Some(mut report) = storage::load_eval_report(&state.database_path, &id) else {
        return Err(ApiError::not_found(format!("Unknown eval report: {id}")));
    };

    report.decision_status = payload.decision_status;
    report.applied_action = payload.applied_action;
    report.decided_by = payload.decided_by;
    report.decided_at = Some(now_token());
    if let Some(note) = payload.note.filter(|value| !value.trim().is_empty()) {
        report.notes.push(format!("decision-note: {note}"));
    }

    storage::persist_eval_report(&state.database_path, &report).map_err(ApiError::bad_request)?;

    Ok(Json(report))
}

async fn list_runs(
    State(state): State<AppState>,
    Query(query): Query<EvalRunListQuery>,
) -> Json<Vec<EvalRunRecord>> {
    let mut runs = storage::load_eval_runs(&state.database_path);
    apply_run_filters(&mut runs, &query);
    Json(runs)
}

async fn get_run(
    State(state): State<AppState>,
    RoutePath(id): RoutePath<String>,
) -> ApiResult<Json<EvalRunRecord>> {
    storage::load_eval_run(&state.database_path, &id)
        .map(Json)
        .ok_or_else(|| ApiError::not_found(format!("Unknown eval run: {id}")))
}

async fn compare_runs(
    State(state): State<AppState>,
    Json(payload): Json<CompareEvalRunsRequest>,
) -> ApiResult<Json<EvalComparisonRecord>> {
    let baseline = storage::load_eval_run(&state.database_path, &payload.baseline_run_id)
        .ok_or_else(|| ApiError::not_found(format!("Unknown eval run: {}", payload.baseline_run_id)))?;
    let candidate = storage::load_eval_run(&state.database_path, &payload.candidate_run_id)
        .ok_or_else(|| ApiError::not_found(format!("Unknown eval run: {}", payload.candidate_run_id)))?;

    Ok(Json(build_comparison(
        &baseline,
        &candidate,
        candidate
            .experiment_label
            .clone()
            .or_else(|| baseline.experiment_label.clone()),
        false,
    )))
}

async fn list_comparisons(
    State(state): State<AppState>,
    Query(query): Query<ComparisonListQuery>,
) -> Json<Vec<EvalComparisonRecord>> {
    let mut comparisons = storage::load_eval_comparisons(&state.database_path);
    apply_comparison_filters(
        &mut comparisons,
        &EvalComparisonListQuery {
            dataset_id: query.dataset_id,
            experiment_label: query.experiment_label,
            provider_model: query.provider_model,
            judge_model: query.judge_model,
            prompt_variant: query.prompt_variant,
            memory_policy_variant: query.memory_policy_variant,
        },
    );
    Json(comparisons)
}

async fn run_pairwise_compare(
    State(state): State<AppState>,
    Json(payload): Json<RunPairwiseEvalRequest>,
) -> ApiResult<Json<PairwiseEvalRunResponse>> {
    let dataset_id = payload.dataset_id.trim().to_string();
    if dataset_id.is_empty() {
        return Err(ApiError::bad_request("datasetId is required"));
    }

    let baseline_run = execute_dataset_run(
        &state,
        RunEvalDatasetRequest {
            dataset_id: dataset_id.clone(),
            mode: Some("single".into()),
            experiment_label: payload.experiment_label.clone(),
            provider_override: payload.baseline_provider_override,
            judge_model_override: payload.baseline_judge_model_override,
            prompt_variant: payload.baseline_prompt_variant,
            memory_policy_variant: payload.baseline_memory_policy_variant,
        },
    )
    .await?;

    let candidate_run = execute_dataset_run(
        &state,
        RunEvalDatasetRequest {
            dataset_id,
            mode: Some("pairwise".into()),
            experiment_label: payload.experiment_label.clone(),
            provider_override: payload.candidate_provider_override,
            judge_model_override: payload.candidate_judge_model_override,
            prompt_variant: payload.candidate_prompt_variant,
            memory_policy_variant: payload.candidate_memory_policy_variant,
        },
    )
    .await?;

    let comparison = build_comparison(
        &baseline_run,
        &candidate_run,
        payload.experiment_label.clone(),
        true,
    );
    storage::persist_eval_comparison(&state.database_path, &comparison)
        .map_err(ApiError::bad_request)?;

    Ok(Json(PairwiseEvalRunResponse {
        baseline_run: baseline_run,
        candidate_run,
        comparison,
    }))
}

async fn run_experiment(
    State(state): State<AppState>,
    RoutePath(id): RoutePath<String>,
) -> ApiResult<Json<EvalExperimentRunResponse>> {
    let preset = storage::load_experiment_presets(&datasets_root())
        .into_iter()
        .find(|preset| preset.id == id)
        .ok_or_else(|| ApiError::not_found(format!("Unknown eval experiment preset: {id}")))?;

    if preset.mode == "pairwise" {
        let pairwise_run = run_pairwise_compare(
            State(state.clone()),
            Json(RunPairwiseEvalRequest {
                dataset_id: preset.dataset_id.clone(),
                experiment_label: preset.experiment_label.clone().or_else(|| Some(preset.id.clone())),
                baseline_provider_override: preset
                    .baseline
                    .as_ref()
                    .and_then(|config| config.provider_override.clone()),
                baseline_judge_model_override: preset
                    .baseline
                    .as_ref()
                    .and_then(|config| config.judge_model_override.clone()),
                baseline_prompt_variant: preset
                    .baseline
                    .as_ref()
                    .and_then(|config| config.prompt_variant.clone()),
                baseline_memory_policy_variant: preset
                    .baseline
                    .as_ref()
                    .and_then(|config| config.memory_policy_variant.clone()),
                candidate_provider_override: preset
                    .candidate
                    .as_ref()
                    .and_then(|config| config.provider_override.clone()),
                candidate_judge_model_override: preset
                    .candidate
                    .as_ref()
                    .and_then(|config| config.judge_model_override.clone()),
                candidate_prompt_variant: preset
                    .candidate
                    .as_ref()
                    .and_then(|config| config.prompt_variant.clone()),
                candidate_memory_policy_variant: preset
                    .candidate
                    .as_ref()
                    .and_then(|config| config.memory_policy_variant.clone()),
            }),
        )
        .await?
        .0;

        let report = build_experiment_report(
            &preset,
            None,
            Some(&pairwise_run),
        );
        storage::persist_eval_report(&state.database_path, &report)
            .map_err(ApiError::bad_request)?;

        return Ok(Json(EvalExperimentRunResponse {
            preset,
            single_run: None,
            pairwise_run: Some(pairwise_run),
        }));
    }

    let single_run = execute_dataset_run(
        &state,
        RunEvalDatasetRequest {
            dataset_id: preset.dataset_id.clone(),
            mode: Some("single".into()),
            experiment_label: preset.experiment_label.clone().or_else(|| Some(preset.id.clone())),
            provider_override: preset
                .candidate
                .as_ref()
                .and_then(|config| config.provider_override.clone())
                .or_else(|| preset.baseline.as_ref().and_then(|config| config.provider_override.clone())),
            judge_model_override: preset
                .candidate
                .as_ref()
                .and_then(|config| config.judge_model_override.clone())
                .or_else(|| preset.baseline.as_ref().and_then(|config| config.judge_model_override.clone())),
            prompt_variant: preset
                .candidate
                .as_ref()
                .and_then(|config| config.prompt_variant.clone())
                .or_else(|| preset.baseline.as_ref().and_then(|config| config.prompt_variant.clone())),
            memory_policy_variant: preset
                .candidate
                .as_ref()
                .and_then(|config| config.memory_policy_variant.clone())
                .or_else(|| preset.baseline.as_ref().and_then(|config| config.memory_policy_variant.clone())),
        },
    )
    .await?;

    let report = build_experiment_report(&preset, Some(&single_run), None);
    storage::persist_eval_report(&state.database_path, &report)
        .map_err(ApiError::bad_request)?;

    Ok(Json(EvalExperimentRunResponse {
        preset,
        single_run: Some(single_run),
        pairwise_run: None,
    }))
}

async fn run_dataset(
    State(state): State<AppState>,
    Json(payload): Json<RunEvalDatasetRequest>,
) -> ApiResult<Json<EvalRunRecord>> {
    execute_dataset_run(&state, payload).await.map(Json)
}

async fn execute_dataset_run(
    state: &AppState,
    payload: RunEvalDatasetRequest,
) -> ApiResult<EvalRunRecord> {
    let dataset_id = payload.dataset_id.trim().to_string();
    if dataset_id.is_empty() {
        return Err(ApiError::bad_request("datasetId is required"));
    }

    let datasets_root = datasets_root();
    let manifest = storage::load_dataset_manifest(&datasets_root, &dataset_id)
        .ok_or_else(|| ApiError::not_found(format!("Unknown eval dataset: {dataset_id}")))?;
    let cases = storage::load_dataset_cases(&datasets_root, &dataset_id);
    let started_at = now_token();
    let run_id = format!("eval-run-{}", started_at);
    let traces_before = storage::load_generation_traces(&state.database_path).len();
    let mut case_results = Vec::with_capacity(cases.len());
    let mut memory_strategy_map = load_memory_strategy_map();
    let mut prompt_variant_map = load_prompt_variant_map();
    let memory_strategy = payload
        .memory_policy_variant
        .as_deref()
        .and_then(|strategy_id| memory_strategy_map.remove(strategy_id));
    let prompt_variant_asset = payload
        .prompt_variant
        .as_deref()
        .and_then(|variant_id| prompt_variant_map.remove(variant_id));
    let config = EvalExecutionConfig {
        provider_override: payload.provider_override.clone(),
        judge_model_override: payload.judge_model_override.clone(),
        prompt_variant: payload.prompt_variant.clone(),
        memory_strategy,
        prompt_variant_asset,
    };
    let effective_provider_model = config.provider_override
        .clone()
        .or_else(|| state.inference_gateway.active_provider().map(|provider| provider.model));
    let effective_judge_model = config
        .judge_model_override
        .clone()
        .or_else(|| effective_provider_model.clone());

    with_eval_overrides(state, config.provider_override.clone(), async {
        for case_record in &cases {
            case_results.push(execute_eval_case(state, case_record, &config).await);
        }
    })
    .await;

    let top_failure_tags = aggregate_failure_tags(&case_results);
    let passed_cases = case_results
        .iter()
        .filter(|result| result.status == "passed")
        .count();
    let failed_cases = case_results
        .iter()
        .filter(|result| result.status == "failed")
        .count();
    let scaffolded_cases = case_results
        .iter()
        .filter(|result| result.status == "scaffolded")
        .count();
    let traces_after = storage::load_generation_traces(&state.database_path).len();

    let run = EvalRunRecord {
        id: run_id,
        dataset_id: manifest.id,
        mode: payload.mode.unwrap_or_else(|| "single".into()),
        experiment_label: payload.experiment_label,
        started_at: started_at.clone(),
        completed_at: Some(started_at),
        status: "completed".into(),
        runner_version: "eval-runner-v1".into(),
        judge_version: "rule-gate-v1".into(),
        effective_provider_model: effective_provider_model.clone(),
        effective_judge_model,
        provider_override: payload.provider_override,
        judge_model_override: payload.judge_model_override,
        prompt_variant: payload.prompt_variant,
        memory_policy_variant: payload.memory_policy_variant,
        summary: EvalRunSummaryRecord {
            case_count: case_results.len(),
            completed_cases: case_results.len(),
            passed_cases,
            failed_cases,
            scaffolded_cases,
            top_failure_tags,
        },
        case_results,
    };

    storage::persist_eval_run(&state.database_path, &run)
        .map_err(ApiError::bad_request)?;
    runtime_paths::append_core_api_log(
        &state.database_path,
        "INFO",
        &format!(
            "eval run created: dataset={} run={} new_traces={}",
            run.dataset_id,
            run.id,
            traces_after.saturating_sub(traces_before)
        ),
    );

    Ok(run)
}

async fn list_traces(
    State(state): State<AppState>,
    Query(query): Query<TraceListQuery>,
) -> Json<Vec<crate::evals::types::GenerationTraceRecord>> {
    let mut traces = storage::load_generation_traces(&state.database_path);

    if let Some(source) = query.source.as_deref().filter(|value| !value.trim().is_empty()) {
        traces.retain(|trace| trace.source == source);
    }
    if let Some(status) = query.status.as_deref().filter(|value| !value.trim().is_empty()) {
        traces.retain(|trace| trace.status == status);
    }
    if let Some(character_id) = query
        .character_id
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        traces.retain(|trace| trace.character_id.as_deref() == Some(character_id));
    }
    if let Some(limit) = query.limit {
        traces.truncate(limit);
    }

    Json(traces)
}

async fn get_trace(
    State(state): State<AppState>,
    RoutePath(id): RoutePath<String>,
) -> ApiResult<Json<crate::evals::types::GenerationTraceRecord>> {
    storage::load_generation_trace(&state.database_path, &id)
        .map(Json)
        .ok_or_else(|| ApiError::not_found(format!("Unknown generation trace: {id}")))
}

fn datasets_root() -> std::path::PathBuf {
    Path::new("datasets").to_path_buf()
}

fn now_token() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}

async fn execute_eval_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    match case_record.dataset_id.as_str() {
        "chat-foundation" => execute_chat_case(state, case_record, config).await,
        "social-boundary" => execute_social_case(state, case_record, config).await,
        "group-intent" => execute_group_intent_case(state, case_record, config).await,
        "memory-summary" => execute_memory_summary_case(state, case_record, config).await,
        "group-coordinator" => execute_group_coordinator_case(state, case_record, config).await,
        _ => EvalCaseResultRecord {
            case_id: case_record.id.clone(),
            status: "scaffolded".into(),
            output: Some("Dataset runner is not wired for this dataset yet.".into()),
            scores: Vec::new(),
            failure_tags: vec![EvalFailureTagRecord {
                key: "runner-scaffold".into(),
                label: "Runner Scaffold".into(),
                count: Some(1),
            }],
            judge_rationale: Some("Dataset family not implemented yet.".into()),
            rule_violations: Vec::new(),
            trace_ids: Vec::new(),
            comparison: None,
        },
    }
}

async fn execute_chat_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    let input = &case_record.input;
    let character_id = value_string(input, "characterId").unwrap_or_default();
    let Some(mut character) = runtime_character(state, &character_id) else {
        return missing_character_case_result(case_record, &character_id);
    };

    if let Some(relationship) = value_string(input, "relationship") {
        character.relationship = relationship.clone();
        character.profile.relationship = relationship;
    }
    character.current_activity = value_string(input, "activityMode");
    if let Some(memory_summary) = value_string(input, "memorySummary") {
        character.profile.memory_summary = memory_summary;
    }
    apply_memory_policy_variant(&mut character, None, config.memory_strategy.as_ref());
    apply_prompt_variant(
        &mut character,
        config.prompt_variant.as_deref(),
        config.prompt_variant_asset.as_ref(),
    );

    let mut history = case_history(input, "history");
    apply_memory_policy_variant(&mut character, Some(&mut history), config.memory_strategy.as_ref());
    let user_message = value_string(input, "userMessage").unwrap_or_default();
    if !user_message.trim().is_empty() {
        history.push(MessageRecord {
            id: format!("eval-message-{}", now_token()),
            conversation_id: format!("eval-conv-{}", case_record.id),
            sender_type: "user".into(),
            sender_id: "eval-user".into(),
            sender_name: "Eval User".into(),
            r#type: "text".into(),
            text: user_message,
            created_at: now_token(),
        });
    }

    let conversation = ConversationRecord {
        id: format!("eval-conv-{}", case_record.id),
        user_id: "eval-user".into(),
        r#type: "direct".into(),
        title: format!("Eval {}", character.name),
        participants: vec!["eval-user".into(), character.id.clone()],
        messages: history.clone(),
        created_at: now_token(),
        updated_at: now_token(),
        last_read_at: None,
    };

    let trace_ids_before = existing_trace_ids(&state.database_path);
    let world_context = eval_world_context(case_record);
    let output = with_eval_world_context(state, world_context, async {
        generation::generate_chat_reply_text(state, &character, &conversation, &history).await
    })
    .await;
    let trace_ids = latest_trace_ids(state, &trace_ids_before);
    build_case_result(state, case_record, output, trace_ids, config).await
}

async fn execute_social_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    let input = &case_record.input;
    let character_id = value_string(input, "characterId").unwrap_or_default();
    let Some(mut character) = runtime_character(state, &character_id) else {
        return missing_character_case_result(case_record, &character_id);
    };

    if let Some(memory_summary) = value_string(input, "memorySummary") {
        character.profile.memory_summary = memory_summary;
    }
    apply_memory_policy_variant(&mut character, None, config.memory_strategy.as_ref());
    apply_prompt_variant(
        &mut character,
        config.prompt_variant.as_deref(),
        config.prompt_variant_asset.as_ref(),
    );

    let trigger_scene = value_string(input, "triggerScene");
    let trace_ids_before = existing_trace_ids(&state.database_path);
    let world_context = eval_world_context(case_record);
    let output = with_eval_world_context(state, world_context, async {
        generation::generate_social_greeting_text(state, &character, trigger_scene.as_deref()).await
    })
    .await;
    let trace_ids = latest_trace_ids(state, &trace_ids_before);
    build_case_result(state, case_record, output, trace_ids, config).await
}

async fn execute_group_intent_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    let input = &case_record.input;
    let character_id = value_string(input, "characterId").unwrap_or_default();
    let Some(mut character) = runtime_character(state, &character_id) else {
        return missing_character_case_result(case_record, &character_id);
    };

    if let Some(memory_summary) = value_string(input, "memorySummary") {
        character.profile.memory_summary = memory_summary;
    }
    apply_memory_policy_variant(&mut character, None, config.memory_strategy.as_ref());
    apply_prompt_variant(
        &mut character,
        config.prompt_variant.as_deref(),
        config.prompt_variant_asset.as_ref(),
    );

    let user_message = value_string(input, "userMessage").unwrap_or_default();
    let trace_ids_before = existing_trace_ids(&state.database_path);
    let output = generation::classify_group_chat_intent(state, &character, &user_message)
        .await
        .map(|intent| {
            serde_json::json!({
                "needsGroupChat": intent.needs_group_chat,
                "reason": intent.reason,
                "requiredDomains": intent.required_domains,
            })
            .to_string()
        });
    let trace_ids = latest_trace_ids(state, &trace_ids_before);
    build_case_result(state, case_record, output, trace_ids, config).await
}

async fn execute_memory_summary_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    let input = &case_record.input;
    let character_id = value_string(input, "characterId").unwrap_or_default();
    let Some(mut character) = runtime_character(state, &character_id) else {
        return missing_character_case_result(case_record, &character_id);
    };

    if let Some(memory_summary) = value_string(input, "memorySummary") {
        character.profile.memory_summary = memory_summary;
    }
    apply_memory_policy_variant(&mut character, None, config.memory_strategy.as_ref());
    apply_prompt_variant(
        &mut character,
        config.prompt_variant.as_deref(),
        config.prompt_variant_asset.as_ref(),
    );

    let mut history = case_history(input, "history");
    apply_memory_policy_variant(&mut character, Some(&mut history), config.memory_strategy.as_ref());
    let trace_ids_before = existing_trace_ids(&state.database_path);
    let output = generation::generate_memory_summary_text(state, &character, &history).await;
    let trace_ids = latest_trace_ids(state, &trace_ids_before);
    build_case_result(state, case_record, output, trace_ids, config).await
}

async fn execute_group_coordinator_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    let input = &case_record.input;
    let trigger_character_id = value_string(input, "triggerCharacterId").unwrap_or_default();
    let Some(trigger_character) = runtime_character(state, &trigger_character_id) else {
        return missing_character_case_result(case_record, &trigger_character_id);
    };
    let mut trigger_character = trigger_character;
    apply_memory_policy_variant(&mut trigger_character, None, config.memory_strategy.as_ref());
    apply_prompt_variant(
        &mut trigger_character,
        config.prompt_variant.as_deref(),
        config.prompt_variant_asset.as_ref(),
    );

    let invited_character_ids = input
        .get("invitedCharacterIds")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let invited_characters = invited_character_ids
        .iter()
        .filter_map(|character_id| runtime_character(state, character_id))
        .map(|mut character| {
            apply_memory_policy_variant(&mut character, None, config.memory_strategy.as_ref());
            apply_prompt_variant(
                &mut character,
                config.prompt_variant.as_deref(),
                config.prompt_variant_asset.as_ref(),
            );
            character
        })
        .collect::<Vec<_>>();
    let topic = value_string(input, "topic").unwrap_or_default();

    let trace_ids_before = existing_trace_ids(&state.database_path);
    let output = generation::generate_group_coordinator_text(
        state,
        &trigger_character,
        &invited_characters,
        &topic,
    )
    .await;
    let trace_ids = latest_trace_ids(state, &trace_ids_before);
    build_case_result(state, case_record, output, trace_ids, config).await
}

async fn build_case_result(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    output: Option<String>,
    trace_ids: Vec<String>,
    config: &EvalExecutionConfig,
) -> EvalCaseResultRecord {
    let output_text = output.unwrap_or_default();
    let mut rule_violations = Vec::new();
    let mut failure_tags = Vec::new();

    if output_text.trim().is_empty() {
        rule_violations.push("输出为空".into());
    }

    for hard_rule in &case_record.expectations.hard_rules {
        evaluate_rule(hard_rule, &output_text, &mut rule_violations);
    }

    for forbidden_outcome in &case_record.expectations.forbidden_outcomes {
        if output_hits_forbidden_outcome(forbidden_outcome, &output_text) {
            failure_tags.push(EvalFailureTagRecord {
                key: forbidden_outcome_key(forbidden_outcome),
                label: format!("Forbidden Outcome: {forbidden_outcome}"),
                count: Some(1),
            });
        }
    }
    let key_info_retained = apply_case_specific_checks(
        case_record,
        &output_text,
        &mut rule_violations,
        &mut failure_tags,
    );

    if !rule_violations.is_empty() {
        failure_tags.push(EvalFailureTagRecord {
            key: "rule-violation".into(),
            label: "Rule Violation".into(),
            count: Some(rule_violations.len() as u32),
        });
    }

    let mut scores = vec![
        EvalScoreRecord {
            key: "output-availability".into(),
            label: "Output Availability".into(),
            value: if output_text.trim().is_empty() { 0.0 } else { 1.0 },
            rationale: Some("Checks whether the eval replay produced a non-empty output.".into()),
        },
        EvalScoreRecord {
            key: "rule-compliance".into(),
            label: "Rule Compliance".into(),
            value: if rule_violations.is_empty() { 1.0 } else { 0.0 },
            rationale: Some(if rule_violations.is_empty() {
                "All heuristic hard-rule checks passed.".into()
            } else {
                format!("Violations: {}", rule_violations.join(" / "))
            }),
        },
        EvalScoreRecord {
            key: "forbidden-outcome-avoidance".into(),
            label: "Forbidden Outcome Avoidance".into(),
            value: if failure_tags
                .iter()
                .any(|tag| tag.key != "rule-violation")
            {
                0.0
            } else {
                1.0
            },
            rationale: Some(if failure_tags.iter().any(|tag| tag.key != "rule-violation") {
                format!(
                    "Forbidden outcomes matched: {}",
                    failure_tags
                        .iter()
                        .filter(|tag| tag.key != "rule-violation")
                        .map(|tag| tag.label.as_str())
                        .collect::<Vec<_>>()
                        .join(" / ")
                )
            } else {
                "No forbidden-outcome heuristics were triggered.".into()
            }),
        },
        EvalScoreRecord {
            key: "key-info-retention".into(),
            label: "Key Info Retention".into(),
            value: if key_info_retained { 1.0 } else { 0.0 },
            rationale: Some(if key_info_retained {
                "Case-specific key information was retained in the output.".into()
            } else {
                "Case-specific key information was missing or structurally inconsistent.".into()
            }),
        },
    ];
    let (judge_scores, judge_rationale) =
        llm_judge_case(state, case_record, &output_text, config.judge_model_override.clone()).await;
    scores.extend(judge_scores);

    persist_trace_evaluation(state, &trace_ids, &scores, &failure_tags);

    EvalCaseResultRecord {
        case_id: case_record.id.clone(),
        status: if rule_violations.is_empty() {
            "passed".into()
        } else {
            "failed".into()
        },
        output: Some(output_text),
        scores,
        failure_tags,
        judge_rationale: Some(
            judge_rationale.unwrap_or_else(|| "Executed against the live generation path with rule-based validation.".into()),
        ),
        rule_violations,
        trace_ids,
        comparison: None,
    }
}

fn evaluate_rule(rule: &str, output: &str, violations: &mut Vec<String>) {
    let trimmed = output.trim();
    if rule.contains("要输出 JSON") && serde_json::from_str::<Value>(trimmed).is_err() {
        violations.push(format!("{rule}: 输出不是合法 JSON"));
    }
    if rule.contains("needsGroupChat 应为 true") {
        match serde_json::from_str::<Value>(trimmed)
            .ok()
            .and_then(|value| value.get("needsGroupChat").and_then(Value::as_bool))
        {
            Some(true) => {}
            _ => violations.push(format!("{rule}: 未命中 true")),
        }
    }
    if rule.contains("needsGroupChat 应为 false") {
        match serde_json::from_str::<Value>(trimmed)
            .ok()
            .and_then(|value| value.get("needsGroupChat").and_then(Value::as_bool))
        {
            Some(false) => {}
            _ => violations.push(format!("{rule}: 未命中 false")),
        }
    }
    if rule.contains("25 字以内") && trimmed.chars().count() > 25 {
        violations.push(format!("{rule}: 实际 {} 字", trimmed.chars().count()));
    }
    if rule.contains("40 字以内") && trimmed.chars().count() > 40 {
        violations.push(format!("{rule}: 实际 {} 字", trimmed.chars().count()));
    }
    if rule.contains("不超过100字符") && trimmed.chars().count() > 100 {
        violations.push(format!("{rule}: 实际 {} 字", trimmed.chars().count()));
    }
    if rule.contains("不超过两句话") {
        let sentence_count = trimmed
            .split(['。', '！', '？', '!', '?'])
            .filter(|segment| !segment.trim().is_empty())
            .count();
        if sentence_count > 2 {
            violations.push(format!("{rule}: 实际 {sentence_count} 句"));
        }
    }
    if rule.contains("自然中文") && trimmed.is_ascii() {
        violations.push(format!("{rule}: 输出看起来不是自然中文"));
    }
    if rule.contains("包含轻量自我介绍")
        && !["我是", "我叫", "叫我", "你可以叫我"].iter().any(|pattern| trimmed.contains(pattern))
    {
        violations.push(format!("{rule}: 未检测到自我介绍"));
    }
    if rule.contains("提到结识场景")
        && !["分享会", "线下", "活动", "场"].iter().any(|pattern| trimmed.contains(pattern))
    {
        violations.push(format!("{rule}: 未体现结识场景"));
    }
    if rule.contains("包含轻微连接动机")
        && !["想认识", "想加你", "想和你", "有空聊", "想继续聊"].iter().any(|pattern| trimmed.contains(pattern))
    {
        violations.push(format!("{rule}: 未检测到连接动机"));
    }
    if rule.contains("要提到拉人原因")
        && !["拉", "叫", "一起", "这事", "这个", "更懂", "帮你"].iter().any(|pattern| trimmed.contains(pattern))
    {
        violations.push(format!("{rule}: 未体现拉人原因"));
    }
    if rule.contains("要提到求职或岗位偏好")
        && !["求职", "简历", "岗位", "平台", "基础设施"].iter().any(|pattern| trimmed.contains(pattern))
    {
        violations.push(format!("{rule}: 未覆盖求职/岗位偏好"));
    }
    if rule.contains("要提到情绪或家庭冲突")
        && !["生气", "委屈", "烦", "家里", "家庭", "冲突"].iter().any(|pattern| trimmed.contains(pattern))
    {
        violations.push(format!("{rule}: 未覆盖情绪/家庭冲突"));
    }
    if rule.contains("不能暴露 AI 身份") && contains_ai_leakage(trimmed) {
        violations.push(format!("{rule}: 命中 AI 泄露词"));
    }
}

fn contains_ai_leakage(value: &str) -> bool {
    ["作为AI", "AI", "人工智能", "语言模型", "助手", "prompt", "policy"]
        .iter()
        .any(|pattern| value.contains(pattern))
}

fn output_hits_forbidden_outcome(forbidden_outcome: &str, output: &str) -> bool {
    let trimmed = output.trim();
    match forbidden_outcome {
        "空输出" => trimmed.is_empty(),
        "明显跑题" => !["技术", "法律", "协议", "期权", "岗位", "求职", "家里", "情绪", "认识", "分享会"]
            .iter()
            .any(|pattern| trimmed.contains(pattern)),
        "逐句复述" => repeated_phrase_count(trimmed) >= 2 || trimmed.contains("用户提到") || trimmed.contains("对话里"),
        "遗漏核心偏好" => !["基础设施", "平台", "岗位", "求职"].iter().any(|pattern| trimmed.contains(pattern)),
        "只写表层事实不写情绪" => !["烦", "委屈", "生气", "情绪", "冲突", "卡住"].iter().any(|pattern| trimmed.contains(pattern)),
        _ => false,
    }
}

fn forbidden_outcome_key(forbidden_outcome: &str) -> String {
    match forbidden_outcome {
        "空输出" => "forbidden-empty-output".into(),
        "明显跑题" => "forbidden-off-topic".into(),
        "逐句复述" => "forbidden-line-by-line-replay".into(),
        "遗漏核心偏好" => "forbidden-missing-core-preference".into(),
        "只写表层事实不写情绪" => "forbidden-missing-emotion".into(),
        _ => format!("forbidden-{}", forbidden_outcome),
    }
}

fn repeated_phrase_count(value: &str) -> usize {
    let clauses = value
        .split(['，', '。', '；', ';', '、'])
        .map(str::trim)
        .filter(|clause| !clause.is_empty())
        .collect::<Vec<_>>();

    let mut repeated = 0;
    for window in clauses.windows(2) {
        if window[0] == window[1] {
            repeated += 1;
        }
    }

    repeated
}

fn apply_case_specific_checks(
    case_record: &crate::evals::types::EvalCaseRecord,
    output: &str,
    rule_violations: &mut Vec<String>,
    failure_tags: &mut Vec<EvalFailureTagRecord>,
) -> bool {
    match case_record.id.as_str() {
        "group-intent-upgrade-multi-domain" => {
            let Some(parsed) = parse_json_output(output) else {
                rule_violations.push("group-intent: 输出 JSON 不可解析".into());
                failure_tags.push(EvalFailureTagRecord {
                    key: "group-intent-invalid-json".into(),
                    label: "Group Intent Invalid JSON".into(),
                    count: Some(1),
                });
                return false;
            };
            let domains = parsed
                .get("requiredDomains")
                .and_then(Value::as_array)
                .map(|items| {
                    items.iter()
                        .filter_map(Value::as_str)
                        .map(|value| value.to_lowercase())
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();
            let has_legal = domains.iter().any(|value| {
                value.contains("法律") || value.contains("法务") || value.contains("legal")
            });
            let has_technical = domains.iter().any(|value| {
                value.contains("技术")
                    || value.contains("架构")
                    || value.contains("工程")
                    || value.contains("tech")
                    || value.contains("infra")
            });
            if !has_legal || !has_technical {
                rule_violations.push("group-intent: requiredDomains 未覆盖法律与技术双领域".into());
                failure_tags.push(EvalFailureTagRecord {
                    key: "group-intent-missing-required-domains".into(),
                    label: "Group Intent Missing Required Domains".into(),
                    count: Some(1),
                });
                return false;
            }
            true
        }
        "group-intent-no-upgrade-single-domain" => {
            let Some(parsed) = parse_json_output(output) else {
                return false;
            };
            let domains = parsed
                .get("requiredDomains")
                .and_then(Value::as_array)
                .map(|items| items.iter().filter_map(Value::as_str).collect::<Vec<_>>())
                .unwrap_or_default();
            if !domains.is_empty() {
                rule_violations.push("group-intent: 单领域问题仍返回了 requiredDomains".into());
                failure_tags.push(EvalFailureTagRecord {
                    key: "group-intent-unexpected-domains".into(),
                    label: "Group Intent Unexpected Domains".into(),
                    count: Some(1),
                });
                return false;
            }
            true
        }
        "memory-summary-career-stress" => {
            let has_job = contains_any_keyword(output, &["求职", "简历", "岗位", "找工作"]);
            let has_preference = contains_any_keyword(output, &["基础设施", "平台", "工程", "不想做纯业务", "crud"]);
            if !has_job || !has_preference {
                rule_violations.push("memory-summary: 未同时保留求职压力与岗位偏好".into());
                failure_tags.push(EvalFailureTagRecord {
                    key: "memory-summary-missing-career-key-info".into(),
                    label: "Memory Summary Missing Career Key Info".into(),
                    count: Some(1),
                });
                return false;
            }
            true
        }
        "memory-summary-emotional-carry" => {
            let has_family = contains_any_keyword(output, &["家里", "家庭", "家人"]);
            let has_emotion = contains_any_keyword(output, &["烦", "委屈", "生气", "卡住", "情绪"]);
            if !has_family || !has_emotion {
                rule_violations.push("memory-summary: 未同时保留家庭冲突与情绪余波".into());
                failure_tags.push(EvalFailureTagRecord {
                    key: "memory-summary-missing-emotion-key-info".into(),
                    label: "Memory Summary Missing Emotion Key Info".into(),
                    count: Some(1),
                });
                return false;
            }
            true
        }
        _ => true,
    }
}

fn contains_any_keyword(output: &str, keywords: &[&str]) -> bool {
    let normalized = output.to_lowercase();
    keywords
        .iter()
        .any(|keyword| normalized.contains(&keyword.to_lowercase()))
}

fn latest_trace_ids(state: &AppState, trace_ids_before: &HashSet<String>) -> Vec<String> {
    storage::load_generation_traces(&state.database_path)
        .into_iter()
        .filter_map(|trace| (!trace_ids_before.contains(&trace.id)).then_some(trace.id))
        .collect()
}

fn aggregate_failure_tags(case_results: &[EvalCaseResultRecord]) -> Vec<EvalFailureTagRecord> {
    let mut counts = std::collections::BTreeMap::<String, (String, u32)>::new();

    for result in case_results {
        for tag in &result.failure_tags {
            let entry = counts
                .entry(tag.key.clone())
                .or_insert_with(|| (tag.label.clone(), 0));
            entry.1 += tag.count.unwrap_or(1);
        }
    }

    counts
        .into_iter()
        .map(|(key, (label, count))| EvalFailureTagRecord {
            key,
            label,
            count: Some(count),
        })
        .collect()
}

fn runtime_character(state: &AppState, character_id: &str) -> Option<CharacterRecord> {
    let runtime = state.runtime.read().expect("runtime lock poisoned");
    runtime.characters.get(character_id).cloned()
}

fn missing_character_case_result(
    case_record: &crate::evals::types::EvalCaseRecord,
    character_id: &str,
) -> EvalCaseResultRecord {
    EvalCaseResultRecord {
        case_id: case_record.id.clone(),
        status: "failed".into(),
        output: Some(String::new()),
        scores: Vec::new(),
        failure_tags: vec![EvalFailureTagRecord {
            key: "missing-character".into(),
            label: "Missing Character".into(),
            count: Some(1),
        }],
        judge_rationale: Some("Case references a character that is missing from runtime state.".into()),
        rule_violations: vec![format!("缺少角色: {character_id}")],
        trace_ids: Vec::new(),
        comparison: None,
    }
}

fn value_string(input: &Value, key: &str) -> Option<String> {
    input.get(key)?.as_str().map(str::to_string)
}

fn existing_trace_ids(database_path: &std::path::Path) -> HashSet<String> {
    storage::load_generation_traces(database_path)
        .into_iter()
        .map(|trace| trace.id)
        .collect()
}

async fn with_eval_world_context<F>(
    state: &AppState,
    world_context: Option<WorldContextRecord>,
    future: F,
) -> Option<String>
where
    F: std::future::Future<Output = Option<String>>,
{
    let temporary_context_id = world_context.as_ref().map(|context| context.id.clone());
    if let Some(world_context) = world_context {
        let mut runtime = state.runtime.write().expect("runtime lock poisoned");
        runtime.world_contexts.push(world_context);
    }

    let output = future.await;

    if let Some(temporary_context_id) = temporary_context_id {
        let mut runtime = state.runtime.write().expect("runtime lock poisoned");
        runtime
            .world_contexts
            .retain(|context| context.id != temporary_context_id);
    }

    output
}

fn eval_world_context(case_record: &crate::evals::types::EvalCaseRecord) -> Option<WorldContextRecord> {
    let input = &case_record.input;
    let world_context = input.get("worldContext");
    let local_time = value_string(input, "localTime")
        .or_else(|| world_context.and_then(|value| value.get("localTime")).and_then(Value::as_str).map(str::to_string));
    let weather = world_context
        .and_then(|value| value.get("weather"))
        .and_then(Value::as_str)
        .map(str::to_string);
    let location = world_context
        .and_then(|value| value.get("city"))
        .and_then(Value::as_str)
        .map(str::to_string);

    if local_time.is_none() && weather.is_none() && location.is_none() {
        return None;
    }

    Some(WorldContextRecord {
        id: format!("eval-world-{}", case_record.id),
        local_time: local_time.unwrap_or_else(|| "2026-04-04T20:00:00+08:00".into()),
        weather,
        location,
        season: None,
        holiday: None,
        recent_events: None,
        timestamp: now_token(),
    })
}

fn persist_trace_evaluation(
    state: &AppState,
    trace_ids: &[String],
    scores: &[EvalScoreRecord],
    failure_tags: &[EvalFailureTagRecord],
) {
    for trace_id in trace_ids {
        let Some(mut trace) = storage::load_generation_trace(&state.database_path, trace_id) else {
            continue;
        };
        trace.evaluation_summary = Some(GenerationTraceEvaluationSummaryRecord {
            scores: scores.to_vec(),
            failure_tags: failure_tags.to_vec(),
        });

        if let Err(error) = storage::persist_generation_trace(&state.database_path, &trace) {
            runtime_paths::append_core_api_log(
                &state.database_path,
                "WARN",
                &format!("failed to persist eval trace summary {}: {}", trace_id, error),
            );
        }
    }
}

async fn llm_judge_case(
    state: &AppState,
    case_record: &crate::evals::types::EvalCaseRecord,
    output_text: &str,
    judge_model_override: Option<String>,
) -> (Vec<EvalScoreRecord>, Option<String>) {
    if output_text.trim().is_empty() || !judge_enabled_for_dataset(&case_record.dataset_id) {
        return (Vec::new(), None);
    }
    if state.inference_gateway.active_provider().is_none() {
        return (Vec::new(), Some("Rule-based validation only. LLM judge skipped because no provider is configured.".into()));
    }

    let rubric_map = load_rubric_map();
    let rubric_labels = case_record
        .expectations
        .judge_rubrics
        .iter()
        .filter_map(|rubric| rubric_map.get(rubric).cloned())
        .collect::<Vec<_>>();
    if rubric_labels.is_empty() {
        return (Vec::new(), None);
    }

    let request = yinjie_inference_gateway::ChatCompletionRequest {
        messages: vec![
            yinjie_inference_gateway::ChatMessage {
                role: "system".into(),
                content: "You are an evaluation judge for an AI social world. Return JSON only.".into(),
            },
            yinjie_inference_gateway::ChatMessage {
                role: "user".into(),
                content: format!(
                    "评测目标：{title}\n数据集：{dataset}\n场景说明：{description}\n硬规则：{hard_rules}\n禁止结果：{forbidden}\n评分类目：{rubrics}\n候选输出：\n{output}\n\n请只返回 JSON，格式如下：\n{{\n  \"summary\": \"一句话总结\",\n  \"scores\": [\n    {{\"key\": \"rubric-key\", \"label\": \"rubric label\", \"value\": 0.0-1.0, \"rationale\": \"简短原因\"}}\n  ]\n}}",
                    title = case_record.title,
                    dataset = case_record.dataset_id,
                    description = case_record.description,
                    hard_rules = if case_record.expectations.hard_rules.is_empty() {
                        "none".into()
                    } else {
                        case_record.expectations.hard_rules.join(" / ")
                    },
                    forbidden = if case_record.expectations.forbidden_outcomes.is_empty() {
                        "none".into()
                    } else {
                        case_record.expectations.forbidden_outcomes.join(" / ")
                    },
                    rubrics = rubric_labels
                        .iter()
                        .map(|rubric| format!("{}:{}:{}", rubric.id, rubric.label, rubric.description))
                        .collect::<Vec<_>>()
                        .join(" / "),
                    output = output_text
                ),
            },
        ],
        model: None,
        temperature: Some(0.1),
        max_tokens: Some(260),
    };

    let response = match with_eval_overrides(state, judge_model_override, async {
        state.inference_gateway.chat_completion(request).await
    })
    .await {
        Ok(response) => response,
        Err(error) => {
            return (
                Vec::new(),
                Some(format!("Rule-based validation only. LLM judge failed: {error}")),
            )
        }
    };
    let Some(parsed) = parse_json_output(&response.content) else {
        return (
            Vec::new(),
            Some("Rule-based validation only. LLM judge returned invalid JSON.".into()),
        );
    };

    let scores = parsed
        .get("scores")
        .and_then(Value::as_array)
        .map(|items| {
            items.iter()
                .filter_map(|item| {
                    let key = item.get("key")?.as_str()?.trim().to_string();
                    let label = item.get("label")?.as_str()?.trim().to_string();
                    let value = item.get("value")?.as_f64()? as f32;
                    let clamped = value.clamp(0.0, 1.0);
                    Some(EvalScoreRecord {
                        key: format!("judge:{key}"),
                        label: format!("Judge {label}"),
                        value: clamped,
                        rationale: item
                            .get("rationale")
                            .and_then(Value::as_str)
                            .map(str::to_string),
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let summary = parsed
        .get("summary")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| Some("Executed with rule-based validation plus LLM judge.".into()));

    (scores, summary)
}

fn judge_enabled_for_dataset(dataset_id: &str) -> bool {
    !matches!(dataset_id, "group-intent")
}

fn build_comparison(
    baseline: &EvalRunRecord,
    candidate: &EvalRunRecord,
    experiment_label: Option<String>,
    persistable: bool,
) -> EvalComparisonRecord {
    let mut case_comparisons = Vec::new();
    let mut wins = 0usize;
    let mut losses = 0usize;
    let mut ties = 0usize;

    for candidate_case in &candidate.case_results {
        let baseline_case = baseline
            .case_results
            .iter()
            .find(|case_result| case_result.case_id == candidate_case.case_id);
        let baseline_score_total = baseline_case.map(score_total).unwrap_or_default();
        let candidate_score_total = score_total(candidate_case);
        let outcome = compare_case_outcome(baseline_case, candidate_case);

        match outcome {
            "win" => wins += 1,
            "lose" => losses += 1,
            _ => ties += 1,
        }

        case_comparisons.push(EvalCaseComparisonSummaryRecord {
            case_id: candidate_case.case_id.clone(),
            baseline_status: baseline_case.map(|value| value.status.clone()),
            candidate_status: Some(candidate_case.status.clone()),
            baseline_output: baseline_case.and_then(|value| value.output.clone()),
            candidate_output: candidate_case.output.clone(),
            baseline_score_total,
            candidate_score_total,
            score_delta: candidate_score_total - baseline_score_total,
            baseline_scores: baseline_case
                .map(|value| value.scores.clone())
                .unwrap_or_default(),
            candidate_scores: candidate_case.scores.clone(),
            baseline_failure_tags: baseline_case
                .map(|value| value.failure_tags.clone())
                .unwrap_or_default(),
            candidate_failure_tags: candidate_case.failure_tags.clone(),
            baseline_rule_violations: baseline_case
                .map(|value| value.rule_violations.clone())
                .unwrap_or_default(),
            candidate_rule_violations: candidate_case.rule_violations.clone(),
            baseline_trace_ids: baseline_case
                .map(|value| value.trace_ids.clone())
                .unwrap_or_default(),
            candidate_trace_ids: candidate_case.trace_ids.clone(),
            outcome: outcome.into(),
        });
    }

    EvalComparisonRecord {
        id: if persistable {
            format!("eval-compare-{}", now_token())
        } else {
            format!("preview-compare-{}-{}", baseline.id, candidate.id)
        },
        created_at: now_token(),
        experiment_label,
        baseline_run_id: baseline.id.clone(),
        candidate_run_id: candidate.id.clone(),
        baseline_dataset_id: baseline.dataset_id.clone(),
        candidate_dataset_id: candidate.dataset_id.clone(),
        baseline_provider_model: baseline.effective_provider_model.clone(),
        candidate_provider_model: candidate.effective_provider_model.clone(),
        baseline_judge_model: baseline.effective_judge_model.clone(),
        candidate_judge_model: candidate.effective_judge_model.clone(),
        baseline_prompt_variant: baseline.prompt_variant.clone(),
        candidate_prompt_variant: candidate.prompt_variant.clone(),
        baseline_memory_policy_variant: baseline.memory_policy_variant.clone(),
        candidate_memory_policy_variant: candidate.memory_policy_variant.clone(),
        summary: EvalComparisonSummaryRecord {
            total_cases: case_comparisons.len(),
            wins,
            losses,
            ties,
        },
        case_comparisons,
    }
}

fn build_experiment_report(
    preset: &EvalExperimentPresetRecord,
    single_run: Option<&EvalRunRecord>,
    pairwise_run: Option<&PairwiseEvalRunResponse>,
) -> EvalExperimentReportRecord {
    let created_at = now_token();

    if let Some(pairwise_run) = pairwise_run {
        let comparison = &pairwise_run.comparison;
        let top_case_deltas = comparison
            .case_comparisons
            .iter()
            .map(|item| EvalCaseDeltaRecord {
                case_id: item.case_id.clone(),
                outcome: item.outcome.clone(),
                score_delta: item.score_delta,
                baseline_status: item.baseline_status.clone(),
                candidate_status: item.candidate_status.clone(),
            })
            .collect::<Vec<_>>();
        let failure_tag_deltas = build_failure_tag_deltas(
            &pairwise_run.baseline_run.summary.top_failure_tags,
            &pairwise_run.candidate_run.summary.top_failure_tags,
        );
        let notes = vec![
            format!(
                "baseline={} candidate={}",
                pairwise_run.baseline_run.id, pairwise_run.candidate_run.id
            ),
            format!(
                "wins={} losses={} ties={}",
                comparison.summary.wins, comparison.summary.losses, comparison.summary.ties
            ),
        ];
        let (keep, regressions, rollback, recommendations) = build_report_recommendations(
            preset,
            Some(comparison),
            None,
            &top_case_deltas,
            &failure_tag_deltas,
        );

        return EvalExperimentReportRecord {
            id: format!("eval-report-{}", created_at),
            created_at,
            preset_id: preset.id.clone(),
            preset_title: preset.title.clone(),
            dataset_id: preset.dataset_id.clone(),
            experiment_label: comparison.experiment_label.clone(),
            mode: "pairwise".into(),
            single_run_id: None,
            baseline_run_id: Some(pairwise_run.baseline_run.id.clone()),
            candidate_run_id: Some(pairwise_run.candidate_run.id.clone()),
            comparison_id: Some(comparison.id.clone()),
            summary: comparison.summary.clone(),
            top_case_deltas: top_case_deltas
                .into_iter()
                .take(8)
                .collect(),
            failure_tag_deltas,
            keep,
            regressions,
            rollback,
            recommendations,
            decision_status: "keep-testing".into(),
            applied_action: None,
            decided_at: None,
            decided_by: None,
            notes,
        };
    }

    let single_run = single_run.expect("single run must exist when pairwise_run is absent");
    let notes = vec![
        format!("single_run={}", single_run.id),
        format!(
            "passed={} failed={} scaffolded={}",
            single_run.summary.passed_cases,
            single_run.summary.failed_cases,
            single_run.summary.scaffolded_cases
        ),
    ];
    let summary = EvalComparisonSummaryRecord {
        total_cases: single_run.summary.case_count,
        wins: single_run.summary.passed_cases,
        losses: single_run.summary.failed_cases,
        ties: single_run.summary.scaffolded_cases,
    };
    let top_case_deltas = single_run
        .case_results
        .iter()
        .map(|item| EvalCaseDeltaRecord {
            case_id: item.case_id.clone(),
            outcome: if item.status == "passed" {
                "win".into()
            } else if item.status == "failed" {
                "lose".into()
            } else {
                "tie".into()
            },
            score_delta: score_total(item),
            baseline_status: None,
            candidate_status: Some(item.status.clone()),
        })
        .take(8)
        .collect::<Vec<_>>();
    let failure_tag_deltas = single_run
        .summary
        .top_failure_tags
        .iter()
        .map(|tag| EvalFailureTagDeltaRecord {
            key: tag.key.clone(),
            label: tag.label.clone(),
            baseline_count: 0,
            candidate_count: tag.count.unwrap_or(1),
            delta: tag.count.unwrap_or(1) as i32,
        })
        .collect::<Vec<_>>();
    let (keep, regressions, rollback, recommendations) = build_report_recommendations(
        preset,
        None,
        Some(single_run),
        &top_case_deltas,
        &failure_tag_deltas,
    );
    EvalExperimentReportRecord {
        id: format!("eval-report-{}", created_at),
        created_at,
        preset_id: preset.id.clone(),
        preset_title: preset.title.clone(),
        dataset_id: preset.dataset_id.clone(),
        experiment_label: single_run.experiment_label.clone(),
        mode: "single".into(),
        single_run_id: Some(single_run.id.clone()),
        baseline_run_id: None,
        candidate_run_id: None,
        comparison_id: None,
        summary,
        top_case_deltas,
        failure_tag_deltas,
        keep,
        regressions,
        rollback,
        recommendations,
        decision_status: "keep-testing".into(),
        applied_action: None,
        decided_at: None,
        decided_by: None,
        notes,
    }
}

fn build_report_recommendations(
    preset: &EvalExperimentPresetRecord,
    comparison: Option<&EvalComparisonRecord>,
    single_run: Option<&EvalRunRecord>,
    top_case_deltas: &[EvalCaseDeltaRecord],
    failure_tag_deltas: &[EvalFailureTagDeltaRecord],
) -> (Vec<String>, Vec<String>, Vec<String>, Vec<String>) {
    let mut keep = Vec::new();
    let mut regressions = Vec::new();
    let mut rollback = Vec::new();
    let mut recommendations = Vec::new();

    if let Some(comparison) = comparison {
        if comparison.summary.wins > comparison.summary.losses {
            keep.push(format!(
                "Current candidate beats baseline on {} of {} cases.",
                comparison.summary.wins, comparison.summary.total_cases
            ));
        }
        if comparison.summary.losses > comparison.summary.wins {
            rollback.push(format!(
                "Candidate loses more often than it wins ({} losses vs {} wins).",
                comparison.summary.losses, comparison.summary.wins
            ));
        }

        for item in top_case_deltas.iter().filter(|item| item.outcome == "lose").take(3) {
            regressions.push(format!(
                "{} regressed with score delta {:.2}.",
                item.case_id, item.score_delta
            ));
        }
    }

    if let Some(single_run) = single_run {
        if single_run.summary.failed_cases == 0 {
            keep.push(format!(
                "Single run passed all {} cases without hard failures.",
                single_run.summary.case_count
            ));
        }
        if single_run.summary.failed_cases > 0 {
            regressions.push(format!(
                "Single run still has {} failed cases that need follow-up.",
                single_run.summary.failed_cases
            ));
        }
    }

    for item in failure_tag_deltas.iter().filter(|item| item.delta > 0).take(3) {
        regressions.push(format!(
            "Failure tag {} increased by {}.",
            item.label, item.delta
        ));
    }
    for item in failure_tag_deltas.iter().filter(|item| item.delta < 0).take(3) {
        keep.push(format!(
            "Failure tag {} decreased by {}.",
            item.label, item.delta.abs()
        ));
    }

    if preset.mode == "pairwise" && comparison.is_some() {
        recommendations.push("Review the top losing cases before promoting this preset.".into());
        recommendations.push("Keep the current comparison id as the baseline for the next iteration.".into());
    } else {
        recommendations.push("Use this single-run result as a baseline seed for a follow-up pairwise experiment.".into());
    }

    if preset
        .candidate
        .as_ref()
        .and_then(|config| config.memory_policy_variant.as_ref())
        .is_some()
    {
        recommendations.push("Check whether the current memory strategy improves retention without increasing forbidden outcomes.".into());
    }
    if preset
        .candidate
        .as_ref()
        .and_then(|config| config.prompt_variant.as_ref())
        .is_some()
    {
        recommendations.push("Inspect candidate output tone changes in traces before rolling this prompt variant wider.".into());
    }

    (keep, regressions, rollback, recommendations)
}

fn build_failure_tag_deltas(
    baseline: &[EvalFailureTagRecord],
    candidate: &[EvalFailureTagRecord],
) -> Vec<EvalFailureTagDeltaRecord> {
    let mut keys = baseline
        .iter()
        .map(|tag| tag.key.clone())
        .collect::<std::collections::BTreeSet<_>>();
    for tag in candidate {
        keys.insert(tag.key.clone());
    }

    keys.into_iter()
        .filter_map(|key| {
            let baseline_tag = baseline.iter().find(|tag| tag.key == key);
            let candidate_tag = candidate.iter().find(|tag| tag.key == key);
            let baseline_count = baseline_tag.and_then(|tag| tag.count).unwrap_or(0);
            let candidate_count = candidate_tag.and_then(|tag| tag.count).unwrap_or(0);
            if baseline_count == 0 && candidate_count == 0 {
                return None;
            }
            Some(EvalFailureTagDeltaRecord {
                key: key.clone(),
                label: candidate_tag
                    .or(baseline_tag)
                    .map(|tag| tag.label.clone())
                    .unwrap_or_else(|| key.clone()),
                baseline_count,
                candidate_count,
                delta: candidate_count as i32 - baseline_count as i32,
            })
        })
        .collect()
}

async fn with_eval_overrides<F, T>(
    state: &AppState,
    provider_override: Option<String>,
    future: F,
) -> T
where
    F: Future<Output = T>,
{
    let previous_provider = state.inference_gateway.active_provider();

    if let (Some(model_override), Some(mut provider)) = (
        provider_override
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty()),
        previous_provider.clone(),
    ) {
        provider.model = model_override.to_string();
        state.inference_gateway.configure_provider(provider);
    }

    let output = future.await;

    if let Some(previous_provider) = previous_provider {
        state.inference_gateway.configure_provider(previous_provider);
    }

    output
}

fn apply_prompt_variant(
    character: &mut CharacterRecord,
    prompt_variant: Option<&str>,
    prompt_variant_asset: Option<&EvalPromptVariantRecord>,
) {
    let instruction = if let Some(prompt_variant_asset) = prompt_variant_asset {
        prompt_variant_asset.instruction.as_str()
    } else {
        let Some(prompt_variant) = prompt_variant.map(str::trim).filter(|value| !value.is_empty()) else {
            return;
        };

        match prompt_variant {
            "concise" => "Keep replies shorter and denser. Prefer one or two compact sentences.",
            "warmer" => "Use slightly warmer, more relational phrasing while staying in character and preserving social boundaries.",
            "sharper" => "Use more direct, high-signal phrasing with less cushioning while staying natural.",
            other => other,
        }
    };

    let base = character
        .profile
        .system_prompt
        .clone()
        .or_else(|| character.profile.base_prompt.clone())
        .unwrap_or_else(|| format!("You are roleplaying {}.", character.name));
    character.profile.system_prompt = Some(format!("{base}\n\nPrompt variant instruction: {instruction}"));
}

fn load_prompt_variant_map() -> std::collections::HashMap<String, EvalPromptVariantRecord> {
    storage::load_prompt_variants(&datasets_root())
        .into_iter()
        .map(|variant| (variant.id.clone(), variant))
        .collect()
}

fn apply_memory_policy_variant(
    character: &mut CharacterRecord,
    history: Option<&mut Vec<MessageRecord>>,
    memory_strategy: Option<&EvalMemoryStrategyRecord>,
) {
    let Some(memory_strategy) = memory_strategy else {
        return;
    };

    if memory_strategy.drop_memory {
        character.profile.memory_summary.clear();
    } else if memory_strategy.id == "recent-only" {
        if let Some(memory) = character.profile.memory.as_ref() {
            if !memory.recent_summary.trim().is_empty() {
                character.profile.memory_summary = memory.recent_summary.clone();
            }
        }
    }

    if let Some(limit) = memory_strategy.truncate_memory_chars {
        if character.profile.memory_summary.chars().count() > limit {
            character.profile.memory_summary = character
                .profile
                .memory_summary
                .chars()
                .take(limit)
                .collect::<String>();
        }
    }

    if let Some(history) = history {
        if let Some(keep_recent_turns) = memory_strategy.keep_recent_turns {
            let keep = history.len().saturating_sub(keep_recent_turns);
            if keep > 0 {
                history.drain(0..keep);
            }
        }
    }

    if let Some(instruction) = memory_strategy
        .prompt_instruction
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let base = character
            .profile
            .system_prompt
            .clone()
            .or_else(|| character.profile.base_prompt.clone())
            .unwrap_or_else(|| format!("You are roleplaying {}.", character.name));
        character.profile.system_prompt = Some(format!(
            "{base}\n\nMemory policy variant instruction: {instruction}"
        ));
    }
}

fn load_rubric_map() -> std::collections::HashMap<String, EvalRubricRecord> {
    storage::load_rubrics(&datasets_root())
        .into_iter()
        .map(|rubric| (rubric.id.clone(), rubric))
        .collect()
}

fn load_memory_strategy_map() -> std::collections::HashMap<String, EvalMemoryStrategyRecord> {
    storage::load_memory_strategies(&datasets_root())
        .into_iter()
        .map(|strategy| (strategy.id.clone(), strategy))
        .collect()
}

fn parse_json_output(value: &str) -> Option<Value> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_prefix = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .unwrap_or(trimmed);
    let normalized = without_prefix.strip_suffix("```").unwrap_or(without_prefix).trim();
    serde_json::from_str(normalized).ok()
}

fn case_history(input: &Value, key: &str) -> Vec<MessageRecord> {
    input.get(key)
        .and_then(Value::as_array)
        .map(|items| {
            items.iter()
                .enumerate()
                .filter_map(|(index, item)| {
                    let role = item.get("role")?.as_str()?;
                    let content = item.get("content")?.as_str()?.to_string();
                    let (sender_type, sender_id, sender_name) = match role {
                        "user" => ("user", "eval-user", "Eval User"),
                        "character" | "assistant" => ("character", "eval-character", "Eval Character"),
                        _ => return None,
                    };

                    Some(MessageRecord {
                        id: format!("eval-history-{}-{}", now_token(), index),
                        conversation_id: "eval-history".into(),
                        sender_type: sender_type.into(),
                        sender_id: sender_id.into(),
                        sender_name: sender_name.into(),
                        r#type: "text".into(),
                        text: content,
                        created_at: now_token(),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn apply_run_filters(runs: &mut Vec<EvalRunRecord>, query: &EvalRunListQuery) {
    if let Some(dataset_id) = query.dataset_id.as_deref().filter(|value| !value.trim().is_empty()) {
        runs.retain(|run| run.dataset_id == dataset_id);
    }
    if let Some(experiment_label) = query
        .experiment_label
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        runs.retain(|run| run.experiment_label.as_deref() == Some(experiment_label));
    }
    if let Some(provider_model) = query
        .provider_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        runs.retain(|run| run.effective_provider_model.as_deref() == Some(provider_model));
    }
    if let Some(judge_model) = query
        .judge_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        runs.retain(|run| run.effective_judge_model.as_deref() == Some(judge_model));
    }
    if let Some(prompt_variant) = query
        .prompt_variant
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        runs.retain(|run| run.prompt_variant.as_deref() == Some(prompt_variant));
    }
    if let Some(memory_policy_variant) = query
        .memory_policy_variant
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        runs.retain(|run| run.memory_policy_variant.as_deref() == Some(memory_policy_variant));
    }
}

fn apply_comparison_filters(
    comparisons: &mut Vec<EvalComparisonRecord>,
    query: &EvalComparisonListQuery,
) {
    if let Some(dataset_id) = query.dataset_id.as_deref().filter(|value| !value.trim().is_empty()) {
        comparisons.retain(|comparison| {
            comparison.baseline_dataset_id == dataset_id || comparison.candidate_dataset_id == dataset_id
        });
    }
    if let Some(experiment_label) = query
        .experiment_label
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        comparisons.retain(|comparison| comparison.experiment_label.as_deref() == Some(experiment_label));
    }
    if let Some(provider_model) = query
        .provider_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        comparisons.retain(|comparison| {
            comparison.baseline_provider_model.as_deref() == Some(provider_model)
                || comparison.candidate_provider_model.as_deref() == Some(provider_model)
        });
    }
    if let Some(judge_model) = query
        .judge_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        comparisons.retain(|comparison| {
            comparison.baseline_judge_model.as_deref() == Some(judge_model)
                || comparison.candidate_judge_model.as_deref() == Some(judge_model)
        });
    }
    if let Some(prompt_variant) = query
        .prompt_variant
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        comparisons.retain(|comparison| {
            comparison.baseline_prompt_variant.as_deref() == Some(prompt_variant)
                || comparison.candidate_prompt_variant.as_deref() == Some(prompt_variant)
        });
    }
    if let Some(memory_policy_variant) = query
        .memory_policy_variant
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        comparisons.retain(|comparison| {
            comparison.baseline_memory_policy_variant.as_deref() == Some(memory_policy_variant)
                || comparison.candidate_memory_policy_variant.as_deref() == Some(memory_policy_variant)
        });
    }
}

fn compare_case_outcome(
    baseline_case: Option<&EvalCaseResultRecord>,
    candidate_case: &EvalCaseResultRecord,
) -> &'static str {
    let Some(baseline_case) = baseline_case else {
        return if candidate_case.status == "passed" { "win" } else { "tie" };
    };

    match (baseline_case.status.as_str(), candidate_case.status.as_str()) {
        ("failed", "passed") => return "win",
        ("passed", "failed") => return "lose",
        ("scaffolded", "passed") => return "win",
        ("passed", "scaffolded") => return "lose",
        _ => {}
    }

    let baseline_score = score_total(baseline_case);
    let candidate_score = score_total(candidate_case);
    if (candidate_score - baseline_score).abs() > f32::EPSILON {
        return if candidate_score > baseline_score {
            "win"
        } else {
            "lose"
        };
    }

    let baseline_failures = failure_tag_total(&baseline_case.failure_tags);
    let candidate_failures = failure_tag_total(&candidate_case.failure_tags);
    if baseline_failures != candidate_failures {
        return if candidate_failures < baseline_failures {
            "win"
        } else {
            "lose"
        };
    }

    "tie"
}

fn score_total(case_result: &EvalCaseResultRecord) -> f32 {
    case_result.scores.iter().map(|score| score.value).sum()
}

fn failure_tag_total(tags: &[EvalFailureTagRecord]) -> u32 {
    tags.iter().map(|tag| tag.count.unwrap_or(1)).sum()
}
