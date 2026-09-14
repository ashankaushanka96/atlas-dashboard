// src/components/tree/TreeLoader.jsx
import React from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import PropTypes from "prop-types";

const TreeLoader = ({ label = "Loading…" }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box sx={{ position: "relative", width: 90, height: 100 }}>
        <Box
          component={motion.div}
          initial={{ y: 0, scaleX: 1, scaleY: 1 }}
          animate={{
            y: [0, -56, 0],
            scaleX: [1, 0.98, 1.04, 1],
            scaleY: [1, 1.04, 0.94, 1],
          }}
          transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            margin: "0 auto",
            background:
              theme.palette.mode === "light"
                ? "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 20%, transparent 45%), linear-gradient(135deg,#1976d2,#00acc1)"
                : "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 20%, transparent 45%), linear-gradient(135deg,#90caf9,#4dd0e1)",
            boxShadow:
              "0 6px 14px rgba(0,0,0,0.18), 0 10px 24px rgba(0,172,193,0.25)",
          }}
        />
        <Box
          component={motion.div}
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: [0.8, 1.0, 0.8], opacity: [0.5, 0.25, 0.5] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            width: 54,
            height: 12,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.22), rgba(0,0,0,0))",
            position: "absolute",
            left: "50%",
            bottom: 6,
            transform: "translateX(-50%)",
            filter: "blur(0.5px)",
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ mt: 1.5, opacity: 0.8 }}>
        {label}
      </Typography>
    </Box>
  );
};

TreeLoader.propTypes = {
  label: PropTypes.string,
};

export default TreeLoader;
