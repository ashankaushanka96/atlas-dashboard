// src/components/ComponentsTableRowItem.jsx
import React, { useState } from "react";
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Collapse,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTheme } from "@mui/material/styles";
import ComponentDetailsDetailed from "./ComponentDetailsDetailed";
import PropTypes from "prop-types";

function TableRowItem({
  comp,
  index,
  copyToClipboard,
  copied,
  onContextMenu,
  columns,
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleRowClick = () => setExpanded((prev) => !prev);

  return (
    <>
      <TableRow
        key={index}
        onContextMenu={(e) => onContextMenu(e, comp)}
        hover
        sx={{
          backgroundColor: theme.palette.mode === "dark" ? "#1E1E1E" : "#fff",
          boxShadow: 1,
          transition: "transform 0.2s, filter 0.2s",
          "& > *:first-of-type": {
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
          },
          "& > *:last-of-type": {
            borderTopRightRadius: "8px",
            borderBottomRightRadius: "8px",
          },
        }}
      >
        {/* Expand/Collapse control */}
        <TableCell>
          <IconButton size="small" onClick={handleRowClick} sx={{ p: 0 }}>
            {expanded ? (
              <Tooltip title="Collapse">
                <ExpandLess fontSize="small" />
              </Tooltip>
            ) : (
              <Tooltip title="Expand">
                <ExpandMore fontSize="small" />
              </Tooltip>
            )}
          </IconButton>
        </TableCell>

        {columns.map((column) => {
          const { id, align } = column;
          let cellContent = comp[id];

          // Copy-to-clipboard for IP
          if (id === "ip") {
            const isCopied = copied.row === index && copied.field === "ip";
            cellContent = (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Tooltip title={isCopied ? "Copied!" : "Copy IP"} arrow>
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(comp.ip, index, "ip")}
                  >
                    <ContentCopyIcon fontSize="small" sx={{ p: 0 }} />
                  </IconButton>
                </Tooltip>
                <Typography variant="body2">{comp.ip}</Typography>
              </Box>
            );
          }
          // Copy-to-clipboard for Path
          else if (id === "component_path") {
            const isCopied = copied.row === index && copied.field === "path";
            cellContent = (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Tooltip title={isCopied ? "Copied!" : "Copy Path"} arrow>
                  <IconButton
                    size="small"
                    onClick={() =>
                      copyToClipboard(comp.comp_path, index, "path")
                    }
                  >
                    <ContentCopyIcon fontSize="small" sx={{ p: 0 }} />
                  </IconButton>
                </Tooltip>
                <Typography variant="body2">{comp.comp_path}</Typography>
              </Box>
            );
          }
          // Default
          else {
            cellContent = comp[id] != null ? comp[id] : "—";
          }

          return (
            <TableCell key={id} align={align || "left"}>
              {cellContent}
            </TableCell>
          );
        })}
      </TableRow>

      {/* Expanded detail row */}
      <TableRow>
        <TableCell
          colSpan={columns.length + 1}
          sx={{ padding: 0, borderBottom: "none" }}
        >
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box
              sx={{
                m: 2,
                p: 3,
                backgroundColor: theme.palette.background.paper,
                borderRadius: "8px",
                border: "1px solid",
                borderColor: theme.palette.divider,
              }}
            >
              <ComponentDetailsDetailed comp={comp} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

TableRowItem.propTypes = {
  comp: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
  copied: PropTypes.shape({ row: PropTypes.number, field: PropTypes.string }),
  onContextMenu: PropTypes.func.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      align: PropTypes.string,
    })
  ).isRequired,
};

export default TableRowItem;
