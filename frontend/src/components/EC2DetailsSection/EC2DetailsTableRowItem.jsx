// EC2DetailsTableRowItem.jsx
import { useState } from "react";
import {
  TableRow,
  TableCell,
  IconButton,
  Collapse,
  Box,
  Tooltip,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import EC2DetailsDetailed from "./EC2DetailsDetailed";
import PropTypes from "prop-types";

// Determine Box background color based on instance status.
const getStatusBoxColor = (status, theme) => {
  if (status) {
    const lower = status.toLowerCase();
    if (lower === "running") return theme.palette.success.main;
    if (lower === "stopped") return theme.palette.error.main;
    if (lower === "terminated") return theme.palette.warning.main; // using warning in place of warn
  }
  return theme.palette.grey[500];
};

const EC2DetailsTableRowItem = ({ instance, index }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleRowClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <TableRow
        key={index}
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
        <TableCell>
          <IconButton onClick={handleRowClick} sx={{ padding: 0, margin: 0 }}>
            {expanded ? (
              <Tooltip title="Collapse">
                <ExpandLess sx={{ margin: 0 }} />
              </Tooltip>
            ) : (
              <Tooltip title="Expand" sx={{ margin: 0 }}>
                <ExpandMore />
              </Tooltip>
            )}
          </IconButton>
        </TableCell>
        <TableCell align="center">{instance.region}</TableCell>
        <TableCell align="left">{instance.instance_name || "N/A"}</TableCell>
        <TableCell align="center">{instance.private_ip || "N/A"}</TableCell>
        <TableCell align="center">{instance.instance_type || "N/A"}</TableCell>
        <TableCell align="center">
          <Box
            sx={{
              backgroundColor: getStatusBoxColor(
                instance.instance_status,
                theme
              ),
              padding: "4px 8px",
              borderRadius: "4px",
              display: "inline-block",
            }}
          >
            {instance.instance_status || "N/A"}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ padding: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box
              sx={{
                m: 2,
                p: 3,
                backgroundColor:
                  theme.palette.mode === "dark" ? "#333" : "#f9f9f9",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: theme.palette.divider,
              }}
            >
              <EC2DetailsDetailed
                region={instance.region}
                instance_id={instance.instance_id}
                ip={instance.private_ip}
              />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

EC2DetailsTableRowItem.propTypes = {
  instance: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

export default EC2DetailsTableRowItem;
