import { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PropTypes from "prop-types";
import { useData } from "../../DataContext";
import axios from "axios";
import { backendDomain } from "../../Config";

function ComponentsAddModal({
  open,
  onClose,
  onAdd,
  initialComponent,
  existingComponents, // New prop for parent's components
}) {
  const [region, setRegion] = useState(initialComponent?.region || "");
  const [ip, setIp] = useState(initialComponent?.ip || "");
  const [components, setComponents] = useState(
    initialComponent?.components || []
  );
  const { allRegions, platforms } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setRegion(initialComponent?.region || "");
      setIp(initialComponent?.ip || "");
      setComponents(initialComponent?.components || []);
    }
  }, [open, initialComponent]);

  useEffect(() => {
    if (initialComponent) {
      loadExistingComponents(initialComponent?.ip || "");
      console.log(initialComponent?.ip || "");
    }
  }, [initialComponent]);

  const handleRegionChange = (e) => {
    setRegion(e.target.value);
  };

  const handleIpChange = (e) => {
    setIp(e.target.value);
  };

  // When user presses Enter or leaves the IP field, load existing components
  const handleIpKeyDown = (e) => {
    if (e.key === "Enter") {
      loadExistingComponents(e.target.value);
    }
  };

  const handleIpBlur = (e) => {
    loadExistingComponents(e.target.value);
  };

  const fetchComponents = async (ip) => {
    setLoading(true);
    const url = `${backendDomain}/components/fetch-components-by-ip`;
    try {
      const response = await axios.get(url, {
        params: { ip: ip, region: region },
      });
      setComponents(response.data.components);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingComponents = (ipValue) => {
    if (!ipValue) return;
    fetchComponents(ipValue);
  };

  // Handlers for the dynamic component rows
  const handleComponentChange = (index, e) => {
    const newComponents = [...components];
    newComponents[index] = {
      ...newComponents[index],
      [e.target.name]: e.target.value,
    };
    setComponents(newComponents);
  };

  const addComponentRow = () => {
    setComponents([
      ...components,
      { component_name: "", platform: "", comp_path: "" },
    ]);
  };

  const removeComponentRow = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Build the payload exactly as you showed:
    const payload = {
      components: components.map((c) => ({
        region,
        ip,
        component_name: c.component_name,
        platform: c.platform,
        comp_path: c.comp_path,
      })),
    };
  
    onAdd(payload);
    // reset state & close…
    setRegion("");
    setIp("");
    setComponents([]);
    onClose();
  };
  

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        style: { width: "60%" },
      }}
      sx={{ marginTop: 4 }}
    >
      <DialogTitle>Add/Edit Components</DialogTitle>
      <DialogContent>
        {/* Region Field */}
        <FormControl fullWidth margin="dense" variant="outlined">
          <InputLabel id="region-select-label">Region</InputLabel>
          <Select
            labelId="region-select-label"
            name="region"
            label="Region"
            value={region}
            onChange={handleRegionChange}
          >
            {allRegions.map((reg) => (
              <MenuItem key={reg} value={reg}>
                {reg}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* IP Field */}
        <TextField
          margin="dense"
          name="ip"
          label="IP"
          fullWidth
          variant="outlined"
          value={ip}
          onChange={handleIpChange}
          onKeyDown={handleIpKeyDown}
          // onBlur={handleIpBlur}
        />
        {/* Show component rows only when region and ip are set */}
        {region && ip && (
          <>
            {loading ? (
              <Box
                sx={{ display: "flex", justifyContent: "center", mb: 2, mt: 8 }}
              >
                <CircularProgress size={50} />
              </Box>
            ) : (
              <>
                {components.map((comp, index) => (
                  <div
                    key={comp._id || index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginTop: 16,
                      gap: 8,
                    }}
                  >
                    <TextField
                      margin="dense"
                      name="component_name"
                      label="Component Name"
                      variant="outlined"
                      value={comp.component_name || ""}
                      onChange={(e) => handleComponentChange(index, e)}
                      style={{ flex: 1, minWidth: 150, maxWidth: 200 }}
                    />
                    <FormControl
                      margin="dense"
                      variant="outlined"
                      style={{ flex: 1, maxWidth: 120 }}
                    >
                      <InputLabel id={`platform-select-label-${index}`}>
                        Platform
                      </InputLabel>
                      <Select
                        labelId={`platform-select-label-${index}`}
                        name="platform"
                        label="Platform"
                        value={comp.platform || ""}
                        onChange={(e) => handleComponentChange(index, e)}
                      >
                        {platforms.map((plat) => (
                          <MenuItem key={plat} value={plat}>
                            {plat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      margin="dense"
                      name="comp_path"
                      label="Component Path"
                      variant="outlined"
                      value={comp.comp_path || ""}
                      onChange={(e) => handleComponentChange(index, e)}
                      style={{ flex: 1, minWidth: 250 }}
                    />
                    <IconButton
                      variant="outlined"
                      color="error"
                      onClick={() => removeComponentRow(index)}
                    >
                      <Tooltip title="Remove Component">
                        <DeleteIcon />
                      </Tooltip>
                    </IconButton>
                  </div>
                ))}
                {/* Button to add a new component row */}
                <Button
                  onClick={addComponentRow}
                  variant="outlined"
                  style={{ marginTop: 16 }}
                >
                  + Add Component
                </Button>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Save Components
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ComponentsAddModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  initialComponent: PropTypes.shape({
    region: PropTypes.string,
    ip: PropTypes.string,
    components: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string,
        component_name: PropTypes.string,
        platform: PropTypes.string,
        comp_path: PropTypes.string,
      })
    ),
  }),
  existingComponents: PropTypes.array, // Array of parent's components
};

export default ComponentsAddModal;
