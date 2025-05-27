import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
} from "@mui/material";
import SchedulerTableRowItem from "./SchedulerTableRowItem";
import PropTypes from "prop-types";

const columns = [
  {
    id: "region",
    label: "Region",
    minWidth: 100,
    maxWidth: 130,
    align: "center",
  },
  {
    id: "ip",
    label: "IP",
    minWidth: 70,
    maxWidth: 70,
    align: "center",
  },
  {
    id: "instance_name",
    label: "Instance Name",
    minWidth: 150,
    maxWidth: 150,
    align: "center",
  },
  {
    id: "action",
    label: "Action",
    minWidth: 100,
    maxWidth: 130,
    align: "center",
  },
  {
    id: "schedule_enabled",
    label: "Schedule Enabled",
    minWidth: 100,
    maxWidth: 130,
    align: "center",
  },
  {
    id: "schedule_time",
    label: "Scheduled Time (GMT)",
    minWidth: 150,
    maxWidth: 60,
    align: "center",
  },
  {
    id: "countdown",
    label: "Countdown",
    minWidth: 50,
    maxWidth: 130,
    align: "center",
  },
];

const SchedulerTable = ({ events, now, loading, error }) => {
  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "80%",
        borderRadius: 2,
      }}
    >
      <TableContainer
        component={Paper}
        sx={{ flex: 1, overflowX: "hidden", overflowY: "auto" }}
      >
        <Table
          stickyHeader
          aria-label="scheduler table"
          sx={{ borderCollapse: "separate", borderSpacing: "0 8px" }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
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
                <TableCell colSpan={7} align="center" sx={{ minHeight: 200 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="error">Error: {error}</Typography>
                </TableCell>
              </TableRow>
            ) : events.length > 0 ? (
              events.map((event, index) => (
                <SchedulerTableRowItem key={index} event={event} now={now} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No matching events found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

SchedulerTable.propTypes = {
  events: PropTypes.array.isRequired,
  now: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.object,
};

export default SchedulerTable;
