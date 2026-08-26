// ════════════════════════════════════════════════════════════════
// Logic Engine — نقطه ورود
// ════════════════════════════════════════════════════════════════

export {
  OPERATORS,
  OPERATOR_ORDER,
  ACTION_TYPES,
  ACTION_TYPE_ORDER,
  GROUP_OPERATORS,
  makeCondition,
  makeAction,
  makeRule,
} from "./types";

export {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateRule,
} from "./conditionEvaluator";

export {
  calculateFlow,
  findNextStep,
  findPrevStep,
} from "./flowEngine";

export {
  validateRules,
  findUnreachableQuestions,
} from "./logicValidator";
