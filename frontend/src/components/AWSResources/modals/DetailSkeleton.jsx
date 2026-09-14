import PropTypes from "prop-types";
import { Box, Grid, Paper } from "@mui/material";
import { keyframes } from "@mui/system";

// These skeletons only ever render inside the AWS Resources detail modals,
// which are always-dark (see the modals' Dialog PaperProps), so the shimmer
// uses the dark palette unconditionally rather than following the app's
// light/dark theme toggle.
const shimmer = keyframes`
  0% { background-position: 200% 0; opacity: .72; }
  50% { opacity: 1; }
  100% { background-position: -200% 0; opacity: .72; }
`;
const skeletonBarBackground =
  "linear-gradient(90deg, rgba(96,165,250,.18), rgba(148,163,184,.38), rgba(96,165,250,.18))";
const shimmerBlockSx = {
  borderRadius: 999,
  background: skeletonBarBackground,
  backgroundSize: "200% 100%",
  animation: `${shimmer} 1.4s linear infinite`,
};
const skeletonPaperSx = {
  p: 2,
  border: "1px solid",
  borderColor: "rgba(148,163,184,0.18)",
  bgcolor: "rgba(148,163,184,0.04)",
};

function DetailSkeleton({ compact = false }) {
  const SectionCard = ({ children, md = 6 }) => (
    <Grid item xs={12} md={md}>
      <Paper elevation={0} sx={skeletonPaperSx}>
        {children}
      </Paper>
    </Grid>
  );

  SectionCard.propTypes = {
    children: PropTypes.node.isRequired,
    md: PropTypes.number,
  };

  SectionCard.defaultProps = {
    md: 6,
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper elevation={0} sx={skeletonPaperSx}>
          <Box sx={{ ...shimmerBlockSx, height: 16, width: 160, mb: 2 }} />
          <Grid container spacing={2}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item}>
                <Box sx={{ ...shimmerBlockSx, height: 10, width: "38%", mb: 1 }} />
                <Box
                  sx={{
                    ...shimmerBlockSx,
                    height: item % 2 === 0 ? 14 : 24,
                    width: item % 2 === 0 ? "72%" : "42%",
                    borderRadius: item % 2 === 0 ? 999 : 999,
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      <SectionCard>
        <Box sx={{ ...shimmerBlockSx, height: 16, width: 132, mb: 2 }} />
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {[52, 68, 44, 60].map((width) => (
            <Box key={width}>
              <Box sx={{ ...shimmerBlockSx, height: 10, width: "34%", mb: 0.8 }} />
              <Box sx={{ ...shimmerBlockSx, height: 13, width: `${width}%` }} />
            </Box>
          ))}
        </Box>
      </SectionCard>

      <SectionCard>
        <Box sx={{ ...shimmerBlockSx, height: 16, width: 146, mb: 2 }} />
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((item) => (
            <Grid item xs={6} key={item}>
              <Box sx={{ ...shimmerBlockSx, height: 10, width: "52%", mb: 0.8 }} />
              <Box sx={{ ...shimmerBlockSx, height: 18, width: "44%" }} />
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {!compact && (
        <Grid item xs={12}>
          <Paper elevation={0} sx={skeletonPaperSx}>
            <Box sx={{ ...shimmerBlockSx, height: 16, width: 156, mb: 2 }} />
            <Grid container spacing={2}>
              {[0, 1, 2, 3].map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item}>
                  <Box
                    sx={{
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "rgba(148,163,184,0.18)",
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ ...shimmerBlockSx, height: 10, width: "46%", mb: 1 }} />
                    <Box sx={{ ...shimmerBlockSx, height: 13, width: "76%", mb: 0.8 }} />
                    <Box sx={{ ...shimmerBlockSx, height: 11, width: "58%" }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}

function InlineTableSkeleton({ rows = 4, columns = 3 }) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 2,
            alignItems: "center",
            py: 0.75,
          }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Box
              key={`${rowIndex}-${columnIndex}`}
              sx={{
                ...shimmerBlockSx,
                height: columnIndex === columns - 1 ? 24 : 12,
                width: columnIndex === columns - 1 ? "58%" : `${60 - columnIndex * 8}%`,
              }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

DetailSkeleton.propTypes = {
  compact: PropTypes.bool,
};

DetailSkeleton.defaultProps = {
  compact: false,
};

InlineTableSkeleton.propTypes = {
  columns: PropTypes.number,
  rows: PropTypes.number,
};

InlineTableSkeleton.defaultProps = {
  columns: 3,
  rows: 4,
};

export { InlineTableSkeleton };
export default DetailSkeleton;
