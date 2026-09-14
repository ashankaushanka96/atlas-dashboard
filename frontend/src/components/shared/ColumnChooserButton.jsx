import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  List,
  ListItem,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import hexToRgb from "./hexToRgb";

const DEFAULT_ACCENT = "#A78BFA";

function SortableColumnRow({ column, onToggle, accentColor }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
  });
  const accentRgb = hexToRgb(accentColor);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      disableGutters
      sx={{
        px: 0.75,
        py: 0.25,
        mx: 0.5,
        my: 0.25,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        "&:hover": { bgcolor: `rgba(${accentRgb}, 0.1)` },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "grab",
          color: "text.secondary",
          touchAction: "none",
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Checkbox
        size="small"
        checked={column.visible}
        onChange={() => onToggle(column.key)}
        sx={{
          p: 0.5,
          color: `rgba(${accentRgb}, 0.6)`,
          "&.Mui-checked": { color: accentColor },
        }}
      />
      <Typography variant="body2" sx={{ userSelect: "none" }}>
        {column.label}
      </Typography>
    </ListItem>
  );
}

SortableColumnRow.propTypes = {
  column: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    visible: PropTypes.bool.isRequired,
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  accentColor: PropTypes.string.isRequired,
};

function ColumnChooserButton({
  columns,
  onToggle,
  onReorder,
  onReset,
  triggerSx,
  accentColor = DEFAULT_ACCENT,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const accentRgb = hexToRgb(accentColor);

  const open = Boolean(anchorEl);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id, over.id);
    }
  };

  return (
    <>
      <Tooltip title="Choose Columns">
        <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)} sx={triggerSx}>
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "14px",
            border: "1px solid rgba(148, 163, 184, 0.16)",
            backgroundImage: "none",
            boxShadow: "0 18px 44px rgba(2, 6, 23, 0.36)",
          },
        }}
      >
        <Box sx={{ p: 1.5, minWidth: 220, maxWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 1, mb: 0.5 }}>
            Columns
          </Typography>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={columns.map((column) => column.key)}
              strategy={verticalListSortingStrategy}
            >
              <List dense disablePadding sx={{ maxHeight: 320, overflowY: "auto" }}>
                {columns.map((column) => (
                  <SortableColumnRow
                    key={column.key}
                    column={column}
                    onToggle={onToggle}
                    accentColor={accentColor}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>

          <Divider sx={{ my: 1, borderColor: "rgba(148, 163, 184, 0.16)" }} />

          <Button
            size="small"
            onClick={onReset}
            sx={{
              ml: 0.5,
              borderRadius: 999,
              textTransform: "none",
              fontWeight: 600,
              color: accentColor,
              "&:hover": { bgcolor: `rgba(${accentRgb}, 0.1)` },
            }}
          >
            Reset to Default
          </Button>
        </Box>
      </Popover>
    </>
  );
}

ColumnChooserButton.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      visible: PropTypes.bool.isRequired,
    })
  ).isRequired,
  onToggle: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  triggerSx: PropTypes.object,
  accentColor: PropTypes.string,
};

export default ColumnChooserButton;
