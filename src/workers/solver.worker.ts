import { solveCutPlan } from "../lib/solver";
import type { SolverInput, SolverResult } from "../lib/solver/types";

type SolverWorkerRequest = {
  type: "solve";
  requestId: string;
  input: SolverInput;
};

type SolverWorkerResponse =
  | {
      type: "result";
      requestId: string;
      result: SolverResult;
    }
  | {
      type: "error";
      requestId: string;
      error: string;
    };

// 워커에서 계산 요청을 받아 절단 계획 계산 결과를 메인 스레드로 돌려준다.
function handleSolverMessage(event: MessageEvent<SolverWorkerRequest>): void {
  const request = event.data;

  if (request.type !== "solve") {
    return;
  }

  try {
    const result = solveCutPlan(request.input);
    const response: SolverWorkerResponse = {
      type: "result",
      requestId: request.requestId,
      result
    };

    self.postMessage(response);
  } catch (error) {
    const response: SolverWorkerResponse = {
      type: "error",
      requestId: request.requestId,
      error: error instanceof Error ? error.message : "알 수 없는 계산 오류가 발생했습니다."
    };

    self.postMessage(response);
  }
}

self.addEventListener("message", handleSolverMessage);
