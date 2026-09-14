import PropTypes from "prop-types";
import {
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import hexToRgb from "./hexToRgb";

const ADVANCED_ACCENT = "#A78BFA";
const ADVANCED_ACCENT_RGB = hexToRgb(ADVANCED_ACCENT);

const pillMenuProps = {
  PaperProps: {
    sx: {
      mt: 1,
      borderRadius: "12px",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      "& .MuiMenuItem-root": { borderRadius: "8px", mx: 0.75, my: 0.25, fontSize: 13 },
      "& .MuiMenuItem-root:hover": { bgcolor: `rgba(${ADVANCED_ACCENT_RGB}, 0.12)` },
      "& .MuiMenuItem-root.Mui-selected": {
        bgcolor: `rgba(${ADVANCED_ACCENT_RGB}, 0.16)`,
        color: ADVANCED_ACCENT,
        fontWeight: 600,
      },
      "& .MuiMenuItem-root.Mui-selected:hover": { bgcolor: `rgba(${ADVANCED_ACCENT_RGB}, 0.24)` },
    },
  },
};

const pillSelectSx = {
  borderRadius: 999,
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    paddingTop: "7px",
    paddingBottom: "7px",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderRadius: 999,
    borderColor: "rgba(148, 163, 184, 0.32)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: `rgba(${ADVANCED_ACCENT_RGB}, 0.6)`,
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: ADVANCED_ACCENT,
  },
};

const pillTextFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 999,
    "& fieldset": { borderColor: "rgba(148, 163, 184, 0.32)" },
    "&:hover fieldset": { borderColor: `rgba(${ADVANCED_ACCENT_RGB}, 0.6)` },
    "&.Mui-focused fieldset": { borderColor: ADVANCED_ACCENT },
  },
};

function PillLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: "block", mb: 0.5, pl: 0.5, color: "text.secondary", fontWeight: 600 }}
    >
      {children}
    </Typography>
  );
}

PillLabel.propTypes = {
  children: PropTypes.node.isRequired,
};

function buildFieldMenuItems(fields) {
  const items = [];
  const seenGroups = new Set();

  fields.forEach((field) => {
    if (!field.group) {
      items.push({ type: "field", field });
    }
  });

  fields.forEach((field) => {
    if (field.group && !seenGroups.has(field.group)) {
      seenGroups.add(field.group);
      items.push({ type: "header", group: field.group });
      fields
        .filter((groupedField) => groupedField.group === field.group)
        .forEach((groupedField) => items.push({ type: "field", field: groupedField }));
    }
  });

  return items;
}

const OPERATOR_LABELS = {
  contains: "Contains",
  equals: "Equals",
  starts_with: "Starts With",
  ends_with: "Ends With",
  not_contains: "Does Not Contain",
  not_equals: "Does Not Equal",
  is_empty: "Is Empty",
  is_not_empty: "Is Not Empty",
  gt: "Greater Than",
  gte: "Greater Than or Equal",
  lt: "Less Than",
  lte: "Less Than or Equal",
};

const defaultRenderValueLabel = (rule, fieldConfig) => {
  const optionLabel =
    fieldConfig?.options?.find((option) => option.value === rule.value)?.label || null;
  return optionLabel || rule.value;
};

function AdvancedSearchPanel({
  advancedField,
  advancedFields,
  advancedJoin,
  advancedOperator,
  advancedOperatorOptions,
  advancedRuleJoinOptions,
  advancedRules,
  advancedValue,
  onAddAdvancedRule,
  onAdvancedFieldChange,
  onAdvancedJoinChange,
  onAdvancedOperatorChange,
  onAdvancedValueChange,
  onRemoveAdvancedRule,
  renderValueLabel = defaultRenderValueLabel,
  advancedOpen,
  title = "Advanced Search",
}) {
  const selectedAdvancedFieldConfig =
    advancedFields.find((field) => field.value === advancedField) || advancedFields[0];
  const selectedAdvancedFieldType = selectedAdvancedFieldConfig?.type || "text";
  const operatorNeedsValue = !["is_empty", "is_not_empty"].includes(advancedOperator);
  const showEnumValueDropdown =
    selectedAdvancedFieldType === "enum" && ["equals", "not_equals"].includes(advancedOperator);
  const canAddAdvancedRule = operatorNeedsValue
    ? selectedAdvancedFieldType === "number"
      ? Boolean(String(advancedValue).trim()) && !Number.isNaN(Number(advancedValue))
      : Boolean(String(advancedValue).trim())
    : true;

  const getChipLabel = (rule, index) => {
    const fieldConfig = advancedFields.find((field) => field.value === rule.field);
    const fieldLabel = fieldConfig
      ? fieldConfig.group
        ? `${fieldConfig.group}: ${fieldConfig.label}`
        : fieldConfig.label
      : rule.field;
    const operatorLabel = OPERATOR_LABELS[rule.operator] || rule.operator;
    const valueLabel = rule.value ? renderValueLabel(rule, fieldConfig) : "";
    const prefix = index === 0 ? "" : `${rule.join} `;
    return [prefix + fieldLabel, operatorLabel, valueLabel].filter(Boolean).join(" ");
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Collapse in={advancedOpen} unmountOnExit>
        <Box
          sx={{
            p: 2,
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.16)",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
            <TuneIcon sx={{ fontSize: 16, color: ADVANCED_ACCENT }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="flex-end">
            {advancedRules.length > 0 ? (
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <PillLabel>Join</PillLabel>
                <Select
                  value={advancedJoin}
                  onChange={onAdvancedJoinChange}
                  MenuProps={pillMenuProps}
                  sx={pillSelectSx}
                >
                  {advancedRuleJoinOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <PillLabel>Field</PillLabel>
              <Select
                value={advancedField}
                onChange={onAdvancedFieldChange}
                MenuProps={pillMenuProps}
                sx={pillSelectSx}
              >
                {buildFieldMenuItems(advancedFields).map((item) =>
                  item.type === "header" ? (
                    <ListSubheader key={`group-${item.group}`}>{item.group}</ListSubheader>
                  ) : (
                    <MenuItem
                      key={item.field.value}
                      value={item.field.value}
                      sx={item.field.group ? { pl: 3 } : undefined}
                    >
                      {item.field.label}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <PillLabel>Condition</PillLabel>
              <Select
                value={advancedOperator}
                onChange={onAdvancedOperatorChange}
                MenuProps={pillMenuProps}
                sx={pillSelectSx}
              >
                {advancedOperatorOptions.map((operator) => (
                  <MenuItem key={operator.value} value={operator.value}>
                    {operator.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {operatorNeedsValue ? (
              showEnumValueDropdown ? (
                <FormControl size="small" sx={{ minWidth: 200, flex: "1 1 220px" }}>
                  <PillLabel>Value</PillLabel>
                  <Select
                    value={advancedValue}
                    MenuProps={pillMenuProps}
                    sx={pillSelectSx}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      onAdvancedValueChange(event);
                      if (nextValue) {
                        onAddAdvancedRule(nextValue);
                      }
                    }}
                  >
                    {(selectedAdvancedFieldConfig?.options || []).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box sx={{ minWidth: 220, flex: "1 1 240px" }}>
                  <PillLabel>Value</PillLabel>
                  <TextField
                    size="small"
                    placeholder="Value"
                    value={advancedValue}
                    onChange={onAdvancedValueChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && canAddAdvancedRule) {
                        event.preventDefault();
                        onAddAdvancedRule();
                      }
                    }}
                    fullWidth
                    sx={pillTextFieldSx}
                  />
                </Box>
              )
            ) : (
              <Chip
                label={OPERATOR_LABELS[advancedOperator]}
                sx={{
                  bgcolor: `rgba(${ADVANCED_ACCENT_RGB}, 0.16)`,
                  color: ADVANCED_ACCENT,
                  fontWeight: 600,
                }}
              />
            )}

            <Button
              variant="contained"
              size="small"
              onClick={() => onAddAdvancedRule()}
              disabled={!canAddAdvancedRule}
              sx={{
                borderRadius: 999,
                bgcolor: ADVANCED_ACCENT,
                boxShadow: "none",
                "&:hover": { bgcolor: ADVANCED_ACCENT, opacity: 0.88, boxShadow: "none" },
              }}
            >
              Add Filter
            </Button>
          </Stack>
        </Box>
      </Collapse>

      {advancedRules.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
          {advancedRules.map((rule, index) => (
            <Chip
              key={rule.id}
              label={getChipLabel(rule, index)}
              onDelete={() => onRemoveAdvancedRule(rule.id)}
              sx={{
                maxWidth: "100%",
                bgcolor: `rgba(${ADVANCED_ACCENT_RGB}, 0.14)`,
                color: ADVANCED_ACCENT,
                fontWeight: 500,
                "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                "& .MuiChip-deleteIcon": { color: `rgba(${ADVANCED_ACCENT_RGB}, 0.7)` },
                "& .MuiChip-deleteIcon:hover": { color: ADVANCED_ACCENT },
              }}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

AdvancedSearchPanel.propTypes = {
  advancedField: PropTypes.string.isRequired,
  advancedFields: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      group: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          value: PropTypes.string.isRequired,
        })
      ),
    })
  ).isRequired,
  advancedJoin: PropTypes.string.isRequired,
  advancedOperator: PropTypes.string.isRequired,
  advancedOperatorOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  advancedRuleJoinOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  advancedRules: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      join: PropTypes.string.isRequired,
      operator: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  advancedValue: PropTypes.string.isRequired,
  advancedOpen: PropTypes.bool.isRequired,
  onAddAdvancedRule: PropTypes.func.isRequired,
  onAdvancedFieldChange: PropTypes.func.isRequired,
  onAdvancedJoinChange: PropTypes.func.isRequired,
  onAdvancedOperatorChange: PropTypes.func.isRequired,
  onAdvancedValueChange: PropTypes.func.isRequired,
  onRemoveAdvancedRule: PropTypes.func.isRequired,
  renderValueLabel: PropTypes.func,
  title: PropTypes.string,
};

AdvancedSearchPanel.defaultProps = {
  title: "Advanced Search",
};

export default AdvancedSearchPanel;
