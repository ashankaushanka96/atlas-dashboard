// EC2DetailsTable.jsx
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  Typography,
  TablePagination,
} from "@mui/material";
import EC2DetailsTableRowItem from "./EC2DetailsTableRowItem";
import PropTypes from "prop-types";

const columns = [
  {
    id: "icon",
    label: "",
    minWidth: 10,
    maxWidth: 10,
    align: "center",
  },
  {
    id: "region",
    label: "Region",
    minWidth: 150,
    maxWidth: 130,
    align: "center",
  },
  {
    id: "instance_name",
    label: "Instance Name",
    minWidth: 200,
    maxWidth: 70,
    align: "center",
  },
  {
    id: "private_ip",
    label: "Private IP",
    minWidth: 100,
    maxWidth: 150,
    align: "center",
  },
  {
    id: "instance_type",
    label: "Instance Type",
    minWidth: 100,
    maxWidth: 130,
    align: "center",
  },
  {
    id: "status",
    label: "Status",
    minWidth: 150,
    maxWidth: 130,
    align: "center",
  },
];

const EC2DetailsTable = ({ instances, loading, error }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [instances]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };
  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "80%",
        borderRadius: 5,
      }}
    >
      <TableContainer
        component={Paper}
        sx={{ flex: 1, overflowX: "hidden", overflowY: "auto" }}
      >
        <Table
          stickyHeader
          aria-label="ec2 details table"
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
            ) : instances.length > 0 ? (
              instances
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((instance) => (
                  <EC2DetailsTableRowItem
                    key={`${instance.region}-${instance.instance_id}`}
                    index={`${instance.region}-${instance.instance_id}`}
                    instance={instance}
                  />
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
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={instances.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

EC2DetailsTable.propTypes = {
  instances: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.object,
};

export default EC2DetailsTable;
