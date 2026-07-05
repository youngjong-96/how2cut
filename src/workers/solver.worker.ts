import { solveGroupedCutPlans } from "../lib/groupedSolver";
import type { GroupedSolverInput, GroupedSolverResult } from "../lib/groupedSolver";
import { solveCutPlan } from "../lib/solver";
import type { SolverInput, SolverResult } from "../lib/solver/types";

type SolverWorkerRequest =
  | {
      type: "solve";
      requestId: string;
      input: SolverInput;
    }
  | {
      type: "solve-grouped";
      requestId: string;
      input: GroupedSolverInput;
    };

type SolverWorkerResponse =
  | {
      type: "result";
      requestId: string;
      result: SolverResult;
    }
  | {
      type: "grouped-result";
      requestId: string;
      result: GroupedSolverResult;
    }
  | {
      type: "error";
      requestId: string;
      error: string;
    };

// 워커에서 단일 절단 계산 요청을 처리하고 결과 메시지를 만든다.
function solveSingleRequest(request: Extract<SolverWorkerRequest, { type: "solve" }>): SolverWorkerResponse {
  return {
    type: "result",
    requestId: request.requestId,
    result: solveCutPlan(request.input)
  };
}

// 워커에서 부품군별 절단 계산 요청을 처리하고 결과 메시지를 만든다.
function solveGroupedRequest(
  request: Extract<SolverWorkerRequest, { type: "solve-grouped" }>
): SolverWorkerResponse {
  return {
    type: "grouped-result",
    requestId: request.requestId,
    result: solveGroupedCutPlans(request.input)
  };
}

// 계산 중 발생한 예외를 메인 스레드가 표시할 수 있는 오류 메시지로 바꾼다.
function createErrorResponse(requestId: string, error: unknown): SolverWorkerResponse {
  return {
    type: "error",
    requestId,
    error: error instanceof Error ? error.message : "알 수 없는 계산 오류가 발생했습니다."
  };
}

// 메인 스레드에서 전달한 계산 요청을 종류에 맞는 솔버로 분기한다.
function handleSolverMessage(event: MessageEvent<SolverWorkerRequest>): void {
  const request = event.data;

  try {
    const response =
      request.type === "solve" ? solveSingleRequest(request) : solveGroupedRequest(request);

    self.postMessage(response);
  } catch (error) {
    self.postMessage(createErrorResponse(request.requestId, error));
  }
}

self.addEventListener("message", handleSolverMessage);
