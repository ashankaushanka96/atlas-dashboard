// src/components/ComponentsTable.jsx
import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ComponentsTableRowItem from "./ComponentsTableRowItem";
import PropTypes from "prop-types";

const columns = [
  {
    id: "region",
    label: "Region",
    minWidth: 130,
    maxWidth: 130,
    align: "center",
  },
  { id: "ip", label: "IP", minWidth: 100, maxWidth: 130, align: "center" },
  {
    id: "component_name",
    label: "Component Name",
    minWidth: 50,
    maxWidth: 60,
    align: "center",
  },
  {
    id: "platform",
    label: "Platform",
    minWidth: 50,
    maxWidth: 130,
    align: "center",
  },
  // ← NEW: show version & pipeline right in the row
  {
    id: "comp_version",
    label: "Version",
    minWidth: 80,
    maxWidth: 100,
    align: "center",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    minWidth: 80,
    maxWidth: 100,
    align: "center",
  },
  {
    id: "component_path",
    label: "Component Path",
    minWidth: 100,
    maxWidth: 130,
    align: "center",
  },
];

function ComponentsTable({
  loading,
  error,
  filteredComponents,
  copyToClipboard,
  copied,
  handleRowContextMenu,
}) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumnIds, setVisibleColumnIds] = useState(
    columns.map((c) => c.id)
  );
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    setPage(0);
  }, [filteredComponents]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };
  const handleSettingsClick = (e) => setAnchorEl(e.currentTarget);
  const handleSettingsClose = () => setAnchorEl(null);
  const toggleColumn = (colId) =>
    setVisibleColumnIds((prev) =>
      prev.includes(colId)
        ? prev.filter((id) => id !== colId)
        : [...prev, colId]
    );

  const visibleColumns = columns.filter((c) => visibleColumnIds.includes(c.id));

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "80%",
        borderRadius: 2,
        position: "relative",
      }}
    >
      {/* settings icon */}
      <IconButton
        onClick={handleSettingsClick}
        sx={{
          position: "absolute",
          top: 1,
          right: 1,
          zIndex: 10,
          bgcolor: theme.palette.background.paper,
        }}
      >
        <SettingsIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleSettingsClose}>
        {columns.map((col) => (
          <MenuItem key={col.id} dense>
            <FormControlLabel
              control={
                <Checkbox
                  checked={visibleColumnIds.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                />
              }
              label={col.label}
            />
          </MenuItem>
        ))}
      </Menu>

      <TableContainer sx={{ flex: 1, overflow: "auto" }}>
        <Table
          stickyHeader
          sx={{ borderCollapse: "separate", borderSpacing: "0 8px" }}
        >
          <TableHead>
            <TableRow>
              {/* expand/collapse icon cell */}
              <TableCell />
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                >
                  <strong>{column.label}</strong>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} align="center">
                  <Typography color="error">Error: {error}</Typography>
                </TableCell>
              </TableRow>
            ) : filteredComponents.length > 0 ? (
              filteredComponents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((comp, idx) => (
                  <ComponentsTableRowItem
                    key={idx}
                    comp={comp}
                    index={idx}
                    copyToClipboard={copyToClipboard}
                    copied={copied}
                    onContextMenu={handleRowContextMenu}
                    columns={visibleColumns}
                  />
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} align="center">
                  <Typography>No matching components found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredComponents.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 100]}
      />
    </Paper>
  );
}

ComponentsTable.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.any,
  filteredComponents: PropTypes.array.isRequired,
  copyToClipboard: PropTypes.func.isRequired,
  copied: PropTypes.object,
  handleRowContextMenu: PropTypes.func.isRequired,
};

export default ComponentsTable;
