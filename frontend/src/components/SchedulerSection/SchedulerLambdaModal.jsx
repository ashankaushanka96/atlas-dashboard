import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { backendDomain } from "../../Config";
import PropTypes from "prop-types";
import { useData } from "../../DataContext";
import axios from "axios";

const LambdaModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { awsRegions } = useData();
  const [selectedRegion, setSelectedRegion] = useState(awsRegions[0]);

  const handleRunLambda = async () => {
    setLoading(true);
    setSuccess(false);
    const url = `${backendDomain}/schedules/run-lambda`;
    try {
      await axios.post(url, null, {
        params: { region: selectedRegion },
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error executing lambda");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state.
    setLoading(false);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Run Lambda Function</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <CircularProgress />
            <Typography variant="body1">Executing lambda...</Typography>
          </Box>
        ) : success ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 4,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 50, color: "green" }} />
            <Typography variant="h6">Execution Successful!</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="lambda-region-label">Select Region</InputLabel>
                <Select
                  labelId="lambda-region-label"
                  label="Select Region"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  {awsRegions.map((reg, index) => (
                    <MenuItem key={index} value={reg}>
                      {reg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="body1">
                Click &#34;RUN LAMBDA&#34; to execute the lambda function for
                the selected region.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {!loading && !success && (
          <Button onClick={handleRunLambda} variant="contained">
            Run Lambda
          </Button>
        )}
        {loading || success ? (
          <Button onClick={handleClose} variant="contained">
            OK
          </Button>
        ) : (
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

LambdaModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LambdaModal;
