// ════════════════════════════════════════════════════════════════
// Logic Engine — نقطه ورود
// ════════════════════════════════════════════════════════════════

export {
  OPERATORS,
  OPERATOR_ORDER,
  TYPE_OPERATORS,
  TYPE_VALUE_FIELD,
  CONDITION_SOURCES,
  JUMP_ACTION_TYPES,
  JUMP_ACTION_TYPE_ORDER,
  ACTION_TYPES,
  ACTION_TYPE_ORDER,
  HIDDEN_BEHAVIORS,
  GROUP_OPERATORS,
  MAX_FLOW_STEPS,
  makeCondition,
  makeConditionGroup,
  makeRule,
  makeAction,
  makeJumpAction,
  makeQuestion,
  isChoiceType,
  isNumericType,
  buildDependencyGraph,
} from "./types";

export {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateRule,
  evaluateQuestionConditions,
} from "./conditionEvaluator";

export {
  calculateFlow,
  evaluateNextStep,
  findNextStep,
  findPrevStep,
} from "./flowEngine";

export {
  validateRules,
  findUnreachableQuestions,
} from "./logicValidator";
