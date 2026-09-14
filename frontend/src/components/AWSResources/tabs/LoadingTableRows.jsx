import PropTypes from "prop-types";
import { Box, TableCell, TableRow, useTheme } from "@mui/material";
import { keyframes } from "@mui/system";

function LoadingTableRows({ colCount, rowsPerPage, actionColumn = true }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === "light";
  const shimmer = keyframes`
    0% { background-position: 200% 0; opacity: .72; }
    50% { opacity: 1; }
    100% { background-position: -200% 0; opacity: .72; }
  `;
  const skeletonBarBackground = isLight
    ? "linear-gradient(90deg, rgba(37,99,235,.10), rgba(148,163,184,.26), rgba(37,99,235,.10))"
    : "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))";
  const shimmerBlockSx = {
    borderRadius: 999,
    background: skeletonBarBackground,
    backgroundSize: "200% 100%",
    animation: `${shimmer} 1.4s linear infinite`,
  };
  const loadingPlaceholderCount = Math.max(12, Math.min(rowsPerPage, 16));
  const loadingPlaceholders = Array.from(
    { length: loadingPlaceholderCount },
    (_, index) => index
  );

  return loadingPlaceholders.map((placeholder) => (
    <TableRow key={placeholder}>
      {Array.from({ length: colCount }, (_, index) => {
        const isLast = index === colCount - 1;
        const isActionCell = actionColumn && isLast;
        return (
          <TableCell key={`${placeholder}-${index}`} align={isActionCell ? "center" : "left"}>
            {isActionCell ? (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  ...shimmerBlockSx,
                  mx: "auto",
                }}
              />
            ) : (
              <Box
                sx={{
                  ...shimmerBlockSx,
                  height: 12,
                  width: `${Math.max(36, 72 - ((index % 4) * 10))}%`,
                  minWidth: 56,
                }}
              />
            )}
          </TableCell>
        );
      })}
    </TableRow>
  ));
}

LoadingTableRows.propTypes = {
  actionColumn: PropTypes.bool,
  colCount: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

LoadingTableRows.defaultProps = {
  actionColumn: true,
};

export default LoadingTableRows;
