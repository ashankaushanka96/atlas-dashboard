export const ADVANCED_OPERATORS = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "equals", label: "Equals" },
    { value: "starts_with", label: "Starts With" },
    { value: "ends_with", label: "Ends With" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "not_equals", label: "Does Not Equal" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ],
  enum: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does Not Equal" },
    { value: "contains", label: "Contains" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "gt", label: "Greater Than" },
    { value: "gte", label: "Greater Than or Equal" },
    { value: "lt", label: "Less Than" },
    { value: "lte", label: "Less Than or Equal" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ],
};

export const ADVANCED_RULE_JOIN_OPTIONS = [
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
  { value: "NOT", label: "NOT" },
];

const ADVANCED_SEARCH_PARAM_NAMES = {
  rules: "adv_rules",
  join: "adv_join",
  field: "adv_field",
  operator: "adv_operator",
  value: "adv_value",
};

function getAdvancedSearchParamKey(name, prefix = "") {
  return prefix ? `${prefix}_${name}` : name;
}

function normalizeRuleJoin(join) {
  return ADVANCED_RULE_JOIN_OPTIONS.some((option) => option.value === join) ? join : "AND";
}

function normalizeRule(rule, index) {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const field = String(rule.field ?? "").trim();
  const operator = String(rule.operator ?? "").trim();

  if (!field || !operator) {
    return null;
  }

  const join = normalizeRuleJoin(String(rule.join ?? "AND").trim().toUpperCase());
  const value = String(rule.value ?? "");

  return {
    id: String(rule.id ?? `${field}-${operator}-${join}-${index}-${value}`),
    join,
    field,
    operator,
    value,
  };
}

export function areAdvancedRulesEqual(leftRules = [], rightRules = []) {
  if (leftRules.length !== rightRules.length) {
    return false;
  }

  return leftRules.every((rule, index) => {
    const rightRule = rightRules[index];
    return (
      rule?.join === rightRule?.join &&
      rule?.field === rightRule?.field &&
      rule?.operator === rightRule?.operator &&
      String(rule?.value ?? "") === String(rightRule?.value ?? "")
    );
  });
}

export function readAdvancedSearchState(
  searchParams,
  { defaultField, defaultOperator = "contains", defaultJoin = "AND", prefix = "" } = {}
) {
  const rawRules = searchParams.get(
    getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.rules, prefix)
  );

  let rules = [];
  if (rawRules) {
    try {
      const parsedRules = JSON.parse(rawRules);
      if (Array.isArray(parsedRules)) {
        rules = parsedRules
          .map((rule, index) => normalizeRule(rule, index))
          .filter(Boolean);
      }
    } catch (_error) {
      rules = [];
    }
  }

  const join = normalizeRuleJoin(
    String(
      searchParams.get(getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.join, prefix)) ||
        defaultJoin
    ).trim().toUpperCase()
  );

  return {
    rules,
    join,
    field:
      searchParams.get(getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.field, prefix)) ||
      defaultField,
    operator:
      searchParams.get(getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.operator, prefix)) ||
      defaultOperator,
    value:
      searchParams.get(getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.value, prefix)) || "",
  };
}

export function writeAdvancedSearchParams(
  searchParams,
  { rules = [], join = "AND", field = "", operator = "", value = "", prefix = "" } = {}
) {
  const normalizedRules = rules
    .map((rule, index) => normalizeRule(rule, index))
    .filter(Boolean)
    .map(({ join: nextJoin, field: nextField, operator: nextOperator, value: nextValue }) => ({
      join: nextJoin,
      field: nextField,
      operator: nextOperator,
      value: nextValue,
    }));

  const rulesKey = getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.rules, prefix);
  const joinKey = getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.join, prefix);
  const fieldKey = getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.field, prefix);
  const operatorKey = getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.operator, prefix);
  const valueKey = getAdvancedSearchParamKey(ADVANCED_SEARCH_PARAM_NAMES.value, prefix);

  if (normalizedRules.length) {
    searchParams.set(rulesKey, JSON.stringify(normalizedRules));
  } else {
    searchParams.delete(rulesKey);
  }

  if (join) {
    searchParams.set(joinKey, join);
  } else {
    searchParams.delete(joinKey);
  }

  if (field) {
    searchParams.set(fieldKey, field);
  } else {
    searchParams.delete(fieldKey);
  }

  if (operator) {
    searchParams.set(operatorKey, operator);
  } else {
    searchParams.delete(operatorKey);
  }

  if (value) {
    searchParams.set(valueKey, value);
  } else {
    searchParams.delete(valueKey);
  }

  return searchParams;
}

export function buildAdvancedFieldMap(fields) {
  return fields.reduce((accumulator, field) => {
    accumulator[field.value] = field;
    return accumulator;
  }, {});
}

export function getAdvancedOperatorOptions(fieldConfig) {
  return fieldConfig ? ADVANCED_OPERATORS[fieldConfig.type] || ADVANCED_OPERATORS.text : ADVANCED_OPERATORS.text;
}

export function doesAdvancedRuleMatch(item, rule, fieldMap, getFieldValue) {
  const fieldConfig = fieldMap[rule.field];
  if (!fieldConfig) {
    return true;
  }

  const rawValue = getFieldValue(item, rule.field);
  const normalizedRuleValue = String(rule.value ?? "").trim().toLowerCase();

  if (fieldConfig.type === "number") {
    if (rule.operator === "is_empty") {
      return rawValue === null || rawValue === undefined || Number.isNaN(Number(rawValue));
    }
    if (rule.operator === "is_not_empty") {
      return rawValue !== null && rawValue !== undefined && !Number.isNaN(Number(rawValue));
    }

    const numericFieldValue = Number(rawValue);
    const numericRuleValue = Number(rule.value);
    if (Number.isNaN(numericFieldValue) || Number.isNaN(numericRuleValue)) {
      return false;
    }

    switch (rule.operator) {
      case "equals":
        return numericFieldValue === numericRuleValue;
      case "gt":
        return numericFieldValue > numericRuleValue;
      case "gte":
        return numericFieldValue >= numericRuleValue;
      case "lt":
        return numericFieldValue < numericRuleValue;
      case "lte":
        return numericFieldValue <= numericRuleValue;
      default:
        return false;
    }
  }

  const normalizedFieldValue = String(rawValue ?? "").trim().toLowerCase();

  switch (rule.operator) {
    case "contains":
      return normalizedFieldValue.includes(normalizedRuleValue);
    case "equals":
      return normalizedFieldValue === normalizedRuleValue;
    case "starts_with":
      return normalizedFieldValue.startsWith(normalizedRuleValue);
    case "ends_with":
      return normalizedFieldValue.endsWith(normalizedRuleValue);
    case "not_contains":
      return !normalizedFieldValue.includes(normalizedRuleValue);
    case "not_equals":
      return normalizedFieldValue !== normalizedRuleValue;
    case "is_empty":
      return normalizedFieldValue.length === 0;
    case "is_not_empty":
      return normalizedFieldValue.length > 0;
    default:
      return false;
  }
}

export function applyAdvancedRules(item, rules, fieldMap, getFieldValue) {
  if (!rules.length) {
    return true;
  }

  return rules.reduce((result, rule, index) => {
    const nextResult = doesAdvancedRuleMatch(item, rule, fieldMap, getFieldValue);

    if (index === 0) {
      return nextResult;
    }

    switch (rule.join) {
      case "OR":
        return result || nextResult;
      case "NOT":
        return result && !nextResult;
      case "AND":
      default:
        return result && nextResult;
    }
  }, true);
}
