// src/components/ErrorModal.jsx
import React from "react";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";
import PropTypes from "prop-types";

export default function ErrorModal({
  wrapperRef,
  open,
  error,
  onClose,
  title = "Oops! Something went wrong.",
}) {
  if (!open) return null;
  
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          backgroundColor: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          borderRadius: 2,
          color: "#fff",
          maxWidth: 450,
          width: "90%",
          mx: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
          {title}
        </Typography>
        <Typography sx={{ mb: 3 }}>
          {error}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderColor: "rgba(255,255,255,0.6)",
              color: "#fff",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "#fff",
              },
            }}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

ErrorModal.propTypes = {
  wrapperRef: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};
