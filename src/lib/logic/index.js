// ════════════════════════════════════════════════════════════════
// Logic Engine — نقطه ورود
// ════════════════════════════════════════════════════════════════

export {
  OPERATORS,
  OPERATOR_ORDER,
  TYPE_OPERATORS,
  TYPE_VALUE_FIELD,
  JUMP_ACTION_TYPES,
  JUMP_ACTION_TYPE_ORDER,
  ACTION_TYPES,
  ACTION_TYPE_ORDER,
  GROUP_OPERATORS,
  makeCondition,
  makeConditionGroup,
  makeJumpAction,
  makeAction,
  makeRule,
  isChoiceType,
  isNumericType,
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
